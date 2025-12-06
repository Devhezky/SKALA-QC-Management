import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth_session');

    if (!sessionCookie) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    try {
        const user = JSON.parse(sessionCookie.value);
        return NextResponse.json({ user });
    } catch (error) {
        return NextResponse.json({ user: null }, { status: 401 });
    }
}
