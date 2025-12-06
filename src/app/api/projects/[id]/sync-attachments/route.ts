import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { perfexClient } from '@/lib/perfex-client';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const projectId = params.id;

        const project = await db.project.findUnique({
            where: { id: projectId }
        });

        if (!project || !project.perfexId) {
            return NextResponse.json(
                { error: 'Project not found or not linked to Perfex' },
                { status: 404 }
            );
        }

        // Get photos from latest inspection
        const latestInspection = await db.qCInspection.findFirst({
            where: { projectId: projectId },
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    where: {
                        photos: {
                            not: '[]' // Simple check, ideally parse JSON
                        }
                    }
                }
            }
        });

        if (!latestInspection) {
            return NextResponse.json({ message: 'No inspections found' });
        }

        let uploadCount = 0;
        let errorCount = 0;

        // Iterate through items and photos
        for (const item of latestInspection.items) {
            try {
                const photos = JSON.parse(item.photos as string);
                if (Array.isArray(photos)) {
                    for (const photoUrl of photos) {
                        // In a real app, we'd fetch the file from storage (S3/Local)
                        // Here we assume photoUrl is accessible or base64
                        // Since we store base64 or local paths, we need to handle it.
                        // For this MVP, let's assume we skip actual file upload if it's complex 
                        // without a real storage provider, OR we try to fetch if it's a URL.

                        // If it's a data URL (base64)
                        if (photoUrl.startsWith('data:')) {
                            const res = await fetch(photoUrl);
                            const blob = await res.blob();
                            const filename = `qc-item-${item.id}-${Date.now()}.jpg`;

                            const success = await perfexClient.uploadProjectFile(project.perfexId, blob, filename);
                            if (success) uploadCount++;
                            else errorCount++;
                        }
                    }
                }
            } catch (e) {
                console.error('Error processing photos for item', item.id, e);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Synced ${uploadCount} attachments. ${errorCount} failed.`
        });

    } catch (error) {
        console.error('Error syncing attachments:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
