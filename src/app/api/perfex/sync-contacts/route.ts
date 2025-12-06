import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { perfexClient } from '@/lib/perfex-client';

export async function POST() {
    try {
        const contacts = await perfexClient.getContacts();

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        for (const contact of contacts) {
            const perfexId = Number(contact.id);
            const perfexClientId = Number(contact.userid);

            // Find the client in our DB
            const client = await db.client.findUnique({
                where: { perfexId: perfexClientId }
            });

            if (!client) {
                console.warn(`Client with Perfex ID ${perfexClientId} not found for contact ${contact.firstname} ${contact.lastname}`);
                skippedCount++;
                continue;
            }

            const existing = await db.contact.findUnique({
                where: { perfexId }
            });

            const data = {
                perfexId,
                clientId: client.id,
                email: contact.email,
                firstname: contact.firstname,
                lastname: contact.lastname,
                phonenumber: contact.phonenumber,
                title: contact.title,
                active: contact.active === '1',
                isPrimary: contact.is_primary === '1',
                lastLogin: contact.last_login ? new Date(contact.last_login) : null
            };

            if (existing) {
                await db.contact.update({
                    where: { id: existing.id },
                    data
                });
                updatedCount++;
            } else {
                await db.contact.create({
                    data
                });
                createdCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Synced ${contacts.length} contacts. Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`,
            stats: { total: contacts.length, created: createdCount, updated: updatedCount, skipped: skippedCount }
        });

    } catch (error) {
        console.error('Error syncing contacts:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to sync contacts' },
            { status: 500 }
        );
    }
}
