import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

// Admin-only endpoint to clean demo/seeded data
export async function DELETE(request: NextRequest) {
    try {
        // Basic auth check - verify user is admin
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('auth_session');

        if (!sessionCookie?.value) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = JSON.parse(sessionCookie.value);
        if (session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        // Delete all inspections and related data (cascade should handle items, signatures, etc.)
        const deletedInspections = await db.qCInspection.deleteMany({});

        // Delete all projects that were imported or demo
        const deletedProjects = await db.project.deleteMany({});

        // Delete all clients
        const deletedClients = await db.client.deleteMany({});

        // Delete all contacts
        const deletedContacts = await db.contact.deleteMany({});

        // Keep users, phases, templates, and system settings

        return NextResponse.json({
            success: true,
            message: 'Demo data cleaned successfully',
            deleted: {
                inspections: deletedInspections.count,
                projects: deletedProjects.count,
                clients: deletedClients.count,
                contacts: deletedContacts.count
            }
        });
    } catch (error) {
        console.error('Error cleaning database:', error);
        return NextResponse.json(
            { error: 'Failed to clean database', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// GET endpoint to check current data counts
export async function GET(request: NextRequest) {
    try {
        const inspectionCount = await db.qCInspection.count();
        const projectCount = await db.project.count();
        const clientCount = await db.client.count();
        const userCount = await db.user.count();

        return NextResponse.json({
            counts: {
                inspections: inspectionCount,
                projects: projectCount,
                clients: clientCount,
                users: userCount
            }
        });
    } catch (error) {
        console.error('Error getting data counts:', error);
        return NextResponse.json(
            { error: 'Failed to get data counts' },
            { status: 500 }
        );
    }
}
