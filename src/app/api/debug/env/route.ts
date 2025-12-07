import { NextRequest, NextResponse } from 'next/server';

// Debug endpoint to check environment variables (without exposing sensitive values)
export async function GET(request: NextRequest) {
    return NextResponse.json({
        environment: process.env.NODE_ENV,
        envVarsStatus: {
            PERFEX_API_URL: process.env.PERFEX_API_URL ? `SET (${process.env.PERFEX_API_URL.substring(0, 30)}...)` : 'NOT SET',
            PERFEX_API_KEY: process.env.PERFEX_API_KEY ? 'SET (hidden)' : 'NOT SET',
            NEXT_PUBLIC_PERFEX_URL: process.env.NEXT_PUBLIC_PERFEX_URL || 'NOT SET',
            NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
            DATABASE_URL: process.env.DATABASE_URL ? 'SET (hidden)' : 'NOT SET',
            NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET'
        },
        timestamp: new Date().toISOString()
    });
}
