import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { perfexClient } from '@/lib/perfex-client';

export async function POST() {
    try {
        const clients = await perfexClient.getClients();

        let createdCount = 0;
        let updatedCount = 0;

        for (const client of clients) {
            const perfexId = Number(client.userid);

            const existing = await db.client.findUnique({
                where: { perfexId }
            });

            const data = {
                perfexId,
                company: client.company,
                vat: client.vat,
                phonenumber: client.phonenumber,
                country: client.country,
                city: client.city,
                zip: client.zip,
                state: client.state,
                address: client.address,
                website: client.website,
                active: client.active === '1'
            };

            if (existing) {
                await db.client.update({
                    where: { id: existing.id },
                    data
                });
                updatedCount++;
            } else {
                await db.client.create({
                    data
                });
                createdCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Synced ${clients.length} clients. Created: ${createdCount}, Updated: ${updatedCount}`,
            stats: { total: clients.length, created: createdCount, updated: updatedCount }
        });

    } catch (error) {
        console.error('Error syncing clients:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to sync clients' },
            { status: 500 }
        );
    }
}
