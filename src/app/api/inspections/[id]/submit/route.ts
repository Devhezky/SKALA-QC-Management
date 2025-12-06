import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inspectionId } = await params

    // First check if inspection exists and get its current state
    const inspection = await db.qCInspection.findUnique({
      where: { id: inspectionId },
      include: {
        items: true,
        project: true,
        phase: true,
        template: true
      }
    })

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    // Check if inspection is already submitted
    if (inspection.status === 'SUBMITTED') {
      return NextResponse.json({ error: 'Inspection is already submitted' }, { status: 400 })
    }

    // Check if all mandatory items are completed
    const mandatoryItemsNotCompleted = inspection.items.filter(item =>
      item.isMandatory && item.status === 'PENDING'
    )

    if (mandatoryItemsNotCompleted.length > 0) {
      return NextResponse.json({
        error: `Cannot submit inspection. ${mandatoryItemsNotCompleted.length} mandatory items are not completed.`
      }, { status: 400 })
    }

    // Check if any mandatory items are NOT_OK
    const mandatoryNotOk = inspection.items.some(item =>
      item.isMandatory && item.status === 'NOT_OK'
    )

    // Update inspection status to SUBMITTED or NEEDS_REWORK
    const updatedInspection = await db.qCInspection.update({
      where: { id: inspectionId },
      data: {
        status: mandatoryNotOk ? 'NEEDS_REWORK' : 'SUBMITTED',
        submittedAt: new Date()
      },
      include: {
        items: true,
        project: true,
        phase: true,
        template: true
      }
    })

    // Create notification
    await db.notification.create({
      data: {
        userId: 'user-1', // Mock user ID for demo
        title: mandatoryNotOk ? 'Inspection Needs Rework' : 'Inspection Submitted',
        message: `Inspection for ${updatedInspection.project.name} (${updatedInspection.phase.name}) has been ${mandatoryNotOk ? 'flagged for rework' : 'submitted successfully'}.`,
        type: mandatoryNotOk ? 'WARNING' : 'SUCCESS',
        link: `/projects/${updatedInspection.projectId}/inspections/${updatedInspection.id}`
      }
    })

    return NextResponse.json(updatedInspection)
  } catch (error) {
    console.error('Error submitting inspection:', error)
    return NextResponse.json({ error: 'Failed to submit inspection' }, { status: 500 })
  }
}
