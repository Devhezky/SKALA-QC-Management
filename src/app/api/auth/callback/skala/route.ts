import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.redirect(new URL('/login?error=missing_code', request.url));
    }

    try {
        // Validate token with Skala Backend
        // We use the internal URL if possible, or the public URL
        // Assuming PERFEX_API_URL is set in .env
        const perfexUrl = process.env.PERFEX_API_URL || 'https://skala.narapatistudio.com';

        // Construct the validation URL. 
        // Using direct HMVC controller path: module/controller/method
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
            // Create session
            const userData = data.user; // Renamed from 'user' to 'userData' for clarity with the new 'response' variable

            console.log('[SSO Callback] User validated:', userData.email);

            // Create the response
            const response = NextResponse.redirect(new URL('/', request.url));

            // Check if this is a popup flow
            const isPopup = searchParams.get('popup') === '1';

            if (isPopup) {
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
                        window.opener.postMessage({ type: 'SKALA_LOGIN_SUCCESS' }, window.location.origin);
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
                popupResponse.cookies.set('auth_session', JSON.stringify(userData), {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 60 * 60 * 24 * 7 // 1 week
                });

                return popupResponse;
            }

            // Set cookie
            response.cookies.set('auth_session', JSON.stringify(userData), {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7 // 1 week
            });

            console.log('[SSO Callback] Cookie set, redirecting to dashboard');

            return response;
        } else {
            console.error('[SSO Callback] Token validation failed:', data);
            return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
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
            return NextResponse.redirect(new URL(`/login?error=validation_error&details=${errorDetails}`, request.url));
        }
        const errorMessage = encodeURIComponent(error instanceof Error ? error.message : String(error));
        return NextResponse.redirect(new URL(`/login?error=validation_error&details=${errorMessage}`, request.url));
    }
}
