import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const clients = await db.client.findMany({
            orderBy: { company: 'asc' },
            include: {
                _count: {
                    select: {
                        contacts: true,
                        projects: true
                    }
                }
            }
        });
        return NextResponse.json(clients);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }
}
