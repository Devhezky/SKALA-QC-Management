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

        // Get failed items from latest inspection
        const latestInspection = await db.qCInspection.findFirst({
            where: { projectId: projectId },
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    where: { status: 'FAIL' },
                    include: { templateItem: true }
                }
            }
        });

        if (!latestInspection || latestInspection.items.length === 0) {
            return NextResponse.json({ message: 'No failed items to sync' });
        }

        let createdCount = 0;
        let errorCount = 0;

        for (const item of latestInspection.items) {
            const taskName = `Fix QC: ${item.templateItem.category} - ${item.templateItem.item}`;
            const description = `QC Inspection Failed.\nNotes: ${item.notes || 'None'}\nInspection Date: ${latestInspection.createdAt.toISOString().split('T')[0]}`;

            // Calculate due date (e.g., 3 days from now)
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 3);

            const success = await perfexClient.createTask({
                name: taskName,
                description: description,
                priority: 3, // High
                startdate: new Date().toISOString().split('T')[0],
                duedate: dueDate.toISOString().split('T')[0],
                rel_id: project.perfexId,
                rel_type: 'project',
                status: 1 // Not Started
            });

            if (success) createdCount++;
            else errorCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Created ${createdCount} tasks in Perfex. ${errorCount} failed.`
        });

    } catch (error) {
        console.error('Error syncing tasks:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
