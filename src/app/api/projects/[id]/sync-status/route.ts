import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { perfexClient } from '@/lib/perfex-client'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { status } = body

        if (!status) {
            return NextResponse.json(
                { success: false, error: 'Status is required' },
                { status: 400 }
            )
        }

        // Get project to find perfexId
        const project = await db.project.findUnique({
            where: { id }
        })

        if (!project) {
            return NextResponse.json(
                { success: false, error: 'Project not found' },
                { status: 404 }
            )
        }

        if (!project.perfexId) {
            return NextResponse.json(
                { success: false, error: 'Project is not linked to Perfex' },
                { status: 400 }
            )
        }

        // Map QC Status to Perfex Status ID
        // 1: Not Started, 2: In Progress, 3: On Hold, 4: Finished, 5: Cancelled
        let perfexStatus = 2 // Default to In Progress

        switch (status) {
            case 'NOT_STARTED':
                perfexStatus = 1
                break
            case 'IN_PROGRESS':
            case 'NEEDS_REWORK':
                perfexStatus = 2
                break
            case 'APPROVED':
                perfexStatus = 4
                break
            case 'REJECTED':
                perfexStatus = 3 // On Hold
                break
            default:
                perfexStatus = 2
        }

        // Update in Perfex
        const success = await perfexClient.updateProjectStatus(project.perfexId, perfexStatus)

        if (success) {
            // Optionally update local status if needed, but usually local status drives this
            return NextResponse.json({
                success: true,
                message: 'Project status synced to Perfex',
                perfexStatus
            })
        } else {
            return NextResponse.json(
                { success: false, error: 'Failed to update status in Perfex' },
                { status: 500 }
            )
        }

    } catch (error) {
        console.error('Error syncing project status:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
