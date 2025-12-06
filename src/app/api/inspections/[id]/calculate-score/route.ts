import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inspectionId } = await params

    // Get inspection with items
    const inspection = await db.qCInspection.findUnique({
      where: { id: inspectionId },
      include: {
        items: {
          include: {
            template: true
          }
        }
      }
    })

    if (!inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    // Calculate score
    const totalWeight = inspection.items.reduce((sum, item) => sum + item.weight, 0)
    const okWeight = inspection.items
      .filter(item => item.status === 'OK')
      .reduce((sum, item) => sum + item.weight, 0)
    
    const newScore = totalWeight > 0 ? Math.round((okWeight / totalWeight) * 100 * 10) / 10 : 0

    // Check if any mandatory items are NOT_OK
    const mandatoryNotOk = inspection.items.some(item => 
      item.isMandatory && item.status === 'NOT_OK'
    )

    // Update inspection score and status
    const updatedInspection = await db.qCInspection.update({
      where: { id: inspectionId },
      data: {
        score: newScore,
        status: mandatoryNotOk ? 'NEEDS_REWORK' : inspection.status
      }
    })

    return NextResponse.json({ 
      success: true, 
      score: newScore,
      message: 'Score calculated successfully'
    })
  } catch (error) {
    console.error('Error calculating score:', error)
    return NextResponse.json({ error: 'Failed to calculate score' }, { status: 500 })
  }
}
