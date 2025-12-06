import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const contacts = await db.contact.findMany({
            orderBy: { firstname: 'asc' },
            include: {
                client: {
                    select: { company: true }
                }
            }
        });
        return NextResponse.json(contacts);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }
}
