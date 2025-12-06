import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { perfexClient } from '@/lib/perfex-client';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const projectId = params.id;

        // 1. Get Project details to get Perfex ID
        const project = await db.project.findUnique({
            where: { id: projectId }
        });

        if (!project || !project.perfexId) {
            return NextResponse.json(
                { error: 'Project not found or not linked to Perfex' },
                { status: 404 }
            );
        }

        // 2. Get Inspection Results
        // We'll summarize the latest inspection or all inspections
        const inspections = await db.qCInspection.findMany({
            where: { projectId: projectId },
            include: {
                inspector: true,
                template: true,
                items: {
                    include: {
                        templateItem: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (inspections.length === 0) {
            return NextResponse.json(
                { message: 'No inspections found to sync' },
                { status: 200 }
            );
        }

        // 3. Format the note content
        const latestInspection = inspections[0];
        const passCount = latestInspection.items.filter(i => i.status === 'PASS').length;
        const failCount = latestInspection.items.filter(i => i.status === 'FAIL').length;
        const totalCount = latestInspection.items.length;
        const score = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;

        const noteContent = `
<b>QC Inspection Result</b><br/>
Date: ${latestInspection.createdAt.toISOString().split('T')[0]}<br/>
Inspector: ${latestInspection.inspector.name}<br/>
Template: ${latestInspection.template.title}<br/>
Status: ${latestInspection.status}<br/>
Score: ${score}% (${passCount} Pass, ${failCount} Fail)<br/>
<br/>
<b>Failed Items:</b><br/>
${latestInspection.items
                .filter(i => i.status === 'FAIL')
                .map(i => `- ${i.templateItem.category}: ${i.templateItem.item} (${i.notes || 'No notes'})`)
                .join('<br/>') || 'None'}
        `.trim();

        // 4. Sync to Perfex
        const success = await perfexClient.createProjectNote(project.perfexId, noteContent);

        if (success) {
            return NextResponse.json({ success: true, message: 'Results synced to Perfex' });
        } else {
            return NextResponse.json(
                { error: 'Failed to sync to Perfex API' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Error syncing results:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
