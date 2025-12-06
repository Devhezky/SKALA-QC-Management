import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Define public paths that don't require authentication
    const publicPaths = [
        '/login',
        '/api/auth/login',
        '/api/auth/logout',
        '/api/auth/callback/skala',  // SSO callback from Skala
        '/api/users/qc',  // Internal API for fetching QC users
        '/api/perfex',    // Perfex integration APIs
        '/api/projects',  // Project APIs including sync
        '/api/reports/pdf', // PDF generation APIs
        '/api/templates',    // Template APIs
        '/_next',
        '/favicon.ico'
    ];

    const isPublicPath = publicPaths.some(path =>
        request.nextUrl.pathname.startsWith(path) || request.nextUrl.pathname === '/'
    );

    // Check for auth session cookie
    const hasSession = request.cookies.has('auth_session');

    // If trying to access protected route without session
    if (!isPublicPath && !hasSession) {
        // Redirect to login page
        const loginUrl = new URL('/login', request.url);
        // Optional: Store return URL
        loginUrl.searchParams.set('from', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    // If trying to access login page while already authenticated
    if (request.nextUrl.pathname === '/login' && hasSession) {
        // Redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes) - Wait, we want to protect some API routes too!
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
