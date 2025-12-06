import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CACHE_KEYS } from '@/lib/cache';

export async function POST(request: NextRequest) {
    try {
        const { ids } = await request.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: 'No project IDs provided' },
                { status: 400 }
            );
        }

        console.log(`Bulk deleting ${ids.length} projects:`, ids);

        // Delete related records first (inspections, analyses, etc.)
        // Then delete projects
        const deleteResult = await db.$transaction(async (tx) => {
            // Delete inspection items first
            await tx.qCInspectionItem.deleteMany({
                where: {
                    inspection: {
                        projectId: { in: ids }
                    }
                }
            });

            // Delete inspections
            await tx.qCInspection.deleteMany({
                where: { projectId: { in: ids } }
            });

            // Delete project analyses
            await tx.projectAnalysis.deleteMany({
                where: { projectId: { in: ids } }
            });

            // Finally delete projects
            const deleted = await tx.project.deleteMany({
                where: { id: { in: ids } }
            });

            return deleted.count;
        });

        // Invalidate cache
        cache.invalidate(CACHE_KEYS.PROJECTS);
        cache.invalidate(CACHE_KEYS.DASHBOARD_SUMMARY);

        console.log(`Successfully deleted ${deleteResult} projects`);

        return NextResponse.json({
            success: true,
            deleted: deleteResult
        });

    } catch (error) {
        console.error('Error bulk deleting projects:', error);
        return NextResponse.json(
            {
                error: 'Failed to delete projects',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
