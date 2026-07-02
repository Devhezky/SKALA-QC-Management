import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://app.skalapro.cloud';
        return NextResponse.redirect(new URL('/login?error=missing_code', baseUrl));
    }

    try {
        // Validate token with Skala Backend.
        // Priority: tenant_url param (passed by Qc_sso) → PERFEX_API_URL env → fallback
        // tenant_url tells us which Perfex tenant generated the token so we validate
        // against the correct database/instance.
        const tenantUrlParam = searchParams.get('tenant_url');
        const perfexUrl = tenantUrlParam
            ? decodeURIComponent(tenantUrlParam).replace(/\/$/, '')
            : (process.env.PERFEX_API_URL || 'http://127.0.0.1').replace(/\/$/, '');

        // Construct the validation URL.
        const validateUrl = `${perfexUrl}/qc_integration/qc_api/validate_token`;

        console.log('[SSO Callback] Received code:', code);
        console.log('[SSO Callback] Validating token with:', validateUrl);

        const response = await axios.post(validateUrl, {
            token: code
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('[SSO Callback] Response status:', response.status);
        console.log('[SSO Callback] Response data:', response.data);

        const data = response.data;

        if (data.status && data.user) {
            const perfexUser = data.user;
            console.log('[SSO Callback] Perfex User validated:', perfexUser.email);
            console.log('[SSO Callback] Role:', perfexUser.role, '| Role name:', perfexUser.role_name);

            // Access Control Gatekeeper
            // role_name is text from Perfex DB, role is numeric ID (fallback)
            const isAdmin = perfexUser.admin === '1' || perfexUser.admin === 1;
            const roleName = (perfexUser.role_name || '').toLowerCase().trim();
            const roleId = String(perfexUser.role || '');

            let mappedRole = 'PROJECT_MANAGER'; // default
            let isAllowed = false;

            if (isAdmin || roleName.includes('super admin') || roleId === '8') {
                mappedRole = 'SUPER_ADMIN';
                isAllowed = true;
            } else if (roleName.includes('designer interior') || roleId === '7') {
                mappedRole = 'DESIGNER_INTERIOR';
                isAllowed = true;
            } else if (roleName.includes('project manager') || roleId === '4') {
                mappedRole = 'PROJECT_MANAGER';
                isAllowed = true;
            } else if (roleName.includes('accounting') || roleId === '2') {
                mappedRole = 'ACCOUNTING';
                isAllowed = true;
            } else if (roleName.includes('furniture engineer') || roleId === '6') {
                // Map furniture engineer as PROJECT_MANAGER (closest match)
                mappedRole = 'PROJECT_MANAGER';
                isAllowed = true;
            } else if (roleName.includes('employee') || roleId === '1') {
                mappedRole = 'PROJECT_MANAGER';
                isAllowed = true;
            } else if (roleName.includes('sales') || roleId === '3') {
                mappedRole = 'PROJECT_MANAGER';
                isAllowed = true;
            }

            if (!isAllowed) {
                console.error('[SSO Callback] User role not allowed:', roleName, '| role ID:', roleId);
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://app.skalapro.cloud';
                return NextResponse.redirect(new URL('/login?error=unauthorized_role_skala', baseUrl));
            }

            // === SYNC USER WITH LOCAL DB ===
            let user = await db.user.findUnique({
                where: { email: perfexUser.email }
            });

            if (user) {
                // Update existing user
                if (user.perfexId !== parseInt(perfexUser.staffid) || user.role !== mappedRole) {
                    user = await db.user.update({
                        where: { id: user.id },
                        data: {
                            perfexId: parseInt(perfexUser.staffid),
                            name: `${perfexUser.firstname} ${perfexUser.lastname}`.trim() || 'SKALA User',
                            role: mappedRole as any,
                        }
                    });
                }
            } else {
                // Check by perfexId just in case email changed (unlikely but possible)
                const parsedStaffId = perfexUser.staffid ? parseInt(perfexUser.staffid) : NaN;

                let existingUserByPerfexId = null;
                if (!isNaN(parsedStaffId)) {
                    existingUserByPerfexId = await db.user.findUnique({
                        where: { perfexId: parsedStaffId }
                    });
                }

                if (existingUserByPerfexId) {
                    user = await db.user.update({
                        where: { id: existingUserByPerfexId.id },
                        data: {
                            email: perfexUser.email,
                            name: `${perfexUser.firstname} ${perfexUser.lastname}`.trim() || 'SKALA User',
                            role: mappedRole as any,
                        }
                    });
                } else {
                    // Create NEW user
                    user = await db.user.create({
                        data: {
                            email: perfexUser.email,
                            name: `${perfexUser.firstname || ''} ${perfexUser.lastname || ''}`.trim() || 'SKALA User',
                            perfexId: !isNaN(parsedStaffId) ? parsedStaffId : undefined,
                            active: perfexUser.active === '1',
                            role: mappedRole as any,
                        }
                    });
                }
            }

            // Create standardized session object (Same as login route)
            const sessionData = {
                id: user.id,
                perfexId: user.perfexId,
                email: user.email,
                name: user.name,
                role: user.role,
                timestamp: Date.now()
            };

            const sessionString = JSON.stringify(sessionData);

            // Create the response
            const redirectResponse = NextResponse.redirect(new URL('/', request.url));

            // Check if this is a popup flow
            const isPopup = searchParams.get('popup') === '1';

            if (isPopup) {
                // Escape session data for safe embedding in HTML/JS
                const escapedSession = JSON.stringify(sessionData).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

                const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Login Successful</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                            background-color: #f8fafc;
                            color: #0f172a;
                        }
                        .success-icon {
                            color: #16a34a;
                            width: 64px;
                            height: 64px;
                            margin-bottom: 16px;
                        }
                        h1 { margin: 0 0 8px; font-size: 24px; }
                        p { margin: 0; color: #64748b; }
                    </style>
                </head>
                <body>
                    <svg class="success-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <h1>Login Successful!</h1>
                    <p>Closing window...</p>
                    <script>
                        // Send session data to parent window so it can set its own cookie
                        const sessionData = ${escapedSession};
                        window.opener.postMessage({ 
                            type: 'SKALA_LOGIN_SUCCESS',
                            sessionData: sessionData
                        }, '*');
                        setTimeout(() => {
                            window.close();
                        }, 1500);
                    </script>
                </body>
                </html>
                `;
                const popupResponse = new NextResponse(html, {
                    headers: { 'Content-Type': 'text/html' },
                });

                // Set the cookie on the popup response as well
                popupResponse.cookies.set('auth_session', sessionString, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 60 * 60 * 24 * 7 // 1 week
                });

                return popupResponse;
            }

            // Fallback for non-popup flow (direct redirect)
            redirectResponse.cookies.set('auth_session', sessionString, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7 // 1 week
            });

            console.log('[SSO Callback] Cookie set, redirecting to dashboard');

            return redirectResponse;
        } else {
            console.error('[SSO Callback] Token validation failed:', data);
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://app.skalapro.cloud';
            return NextResponse.redirect(new URL('/login?error=invalid_token', baseUrl));
        }
    } catch (error) {
        console.error('[SSO Callback] Error validating token:', error);

        // Write error to file for debugging
        const fs = require('fs');
        const logMessage = `[${new Date().toISOString()}] Error: ${error instanceof Error ? error.message : String(error)}\n`;
        try {
            fs.appendFileSync('sso-debug.log', logMessage);
            if (axios.isAxiosError(error)) {
                fs.appendFileSync('sso-debug.log', `Response: ${JSON.stringify(error.response?.data)}\nStatus: ${error.response?.status}\n`);
            }
        } catch (e) {
            console.error('Failed to write log file', e);
        }

        if (axios.isAxiosError(error)) {
            console.error('[SSO Callback] Axios error details:', {
                message: error.message,
                code: error.code,
                response: error.response?.data
            });
            const errorDetails = encodeURIComponent(JSON.stringify(error.response?.data || error.message));
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://app.skalapro.cloud';
            return NextResponse.redirect(new URL(`/login?error=validation_error&details=${errorDetails}`, baseUrl));
        }
        const errorMessage = encodeURIComponent(error instanceof Error ? error.message : String(error));
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://app.skalapro.cloud';
        return NextResponse.redirect(new URL(`/login?error=validation_error&details=${errorMessage}`, baseUrl));
    }
}
