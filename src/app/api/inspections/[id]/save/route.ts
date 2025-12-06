import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inspectionId } = await params
    const data = await request.json()
    const { items } = data

    // Update each inspection item
    await Promise.all(
      items.map(async (itemData: any) => {
        await db.qCInspectionItem.update({
          where: { 
            id: itemData.id,
            inspectionId: inspectionId
          },
          data: {
            status: itemData.status,
            measuredValue: itemData.measuredValue,
            notes: itemData.notes
          }
        })
      })
    )

    // Recalculate inspection score
    const inspection = await db.qCInspection.findUnique({
      where: { id: inspectionId },
      include: { items: true }
    })

    if (inspection) {
      const totalWeight = inspection.items.reduce((sum, item) => sum + item.weight, 0)
      const okWeight = inspection.items
        .filter(item => item.status === 'OK')
        .reduce((sum, item) => sum + item.weight, 0)
      
      const newScore = totalWeight > 0 ? (okWeight / totalWeight) * 100 : 0

      // Check if any mandatory items are NOT_OK
      const mandatoryNotOk = inspection.items.some(item => 
        item.isMandatory && item.status === 'NOT_OK'
      )

      // Update inspection score and status if needed
      await db.qCInspection.update({
        where: { id: inspectionId },
        data: {
          score: newScore,
          status: mandatoryNotOk ? 'NEEDS_REWORK' : inspection.status
        }
      })
    }

    return NextResponse.json({ success: true, message: 'Draft saved successfully' })
  } catch (error) {
    console.error('Error saving draft:', error)
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
  }
}
