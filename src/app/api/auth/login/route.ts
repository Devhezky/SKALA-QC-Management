import { NextRequest, NextResponse } from 'next/server';
import { perfexClient } from '../../../../lib/perfex-client';
import { db } from '../../../../lib/db';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        console.log('Attempting login for:', email);

        // 1. Check if user exists locally
        let user = await db.user.findUnique({
            where: { email }
        });

        // DEMO USER BYPASS
        if (email === 'demo@narapatistudio.com' && password === 'demo123') {
            const demoUser = await db.user.upsert({
                where: { email: 'demo@narapatistudio.com' },
                update: {},
                create: {
                    email: 'demo@narapatistudio.com',
                    name: 'Demo Admin',
                    role: 'ADMIN',
                    active: true,
                    perfexId: 999999
                }
            });

            const sessionData = JSON.stringify({
                id: demoUser.id,
                perfexId: demoUser.perfexId,
                email: demoUser.email,
                name: demoUser.name,
                role: demoUser.role,
                timestamp: Date.now()
            });

            const cookieStore = await cookies();
            cookieStore.set('auth_session', sessionData, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 8, // 8 hours
                path: '/',
            });

            return NextResponse.json({
                success: true,
                user: {
                    id: demoUser.id,
                    email: demoUser.email,
                    name: demoUser.name,
                    role: demoUser.role,
                }
            });
        }

        // 2. If not found locally, try to find in Perfex and sync
        if (!user) {
            const perfexUser = await perfexClient.validateStaff(email);
            if (perfexUser) {
                try {
                    // Check if user with same perfexId already exists
                    const existingUserByPerfexId = await db.user.findUnique({
                        where: { perfexId: parseInt(perfexUser.staffid) }
                    });

                    if (existingUserByPerfexId) {
                        // Update existing user's email if different
                        if (existingUserByPerfexId.email !== email) {
                            user = await db.user.update({
                                where: { id: existingUserByPerfexId.id },
                                data: {
                                    email: perfexUser.email,
                                    name: `${perfexUser.firstname} ${perfexUser.lastname}`,
                                    active: perfexUser.active === '1',
                                    role: perfexUser.admin === '1' ? 'ADMIN' : 'QC',
                                }
                            });
                        } else {
                            user = existingUserByPerfexId;
                        }
                    } else {
                        // Create new user
                        user = await db.user.create({
                            data: {
                                email: perfexUser.email,
                                name: `${perfexUser.firstname} ${perfexUser.lastname}`,
                                perfexId: parseInt(perfexUser.staffid),
                                active: perfexUser.active === '1',
                                role: perfexUser.admin === '1' ? 'ADMIN' : 'QC',
                            }
                        });
                    }
                } catch (createError) {
                    console.error('Error creating user from Perfex data:', createError);
                    // If create fails, try to find again
                    user = await db.user.findUnique({ where: { email } });
                }
            }
        }

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 401 }
            );
        }

        if (!user.active) {
            return NextResponse.json(
                { error: 'Account is inactive' },
                { status: 403 }
            );
        }

        // 3. Verify Password against Perfex
        // Since we don't store passwords locally (or shouldn't store plain text),
        // we verify against Perfex API.
        console.log(`Verifying credentials for ${email} against Perfex...`);
        const isValid = await perfexClient.verifyCredentials(email, password);

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // 4. Create Session
        const sessionData = JSON.stringify({
            id: user.id,
            perfexId: user.perfexId,
            email: user.email,
            name: user.name,
            role: user.role,
            timestamp: Date.now()
        });

        const cookieStore = await cookies();

        cookieStore.set('auth_session', sessionData, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 8, // 8 hours
            path: '/',
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
