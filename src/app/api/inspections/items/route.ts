import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { itemId, status, measuredValue, notes } = data

    // Update the inspection item
    const updatedItem = await db.qCInspectionItem.update({
      where: { id: itemId },
      data: {
        status,
        measuredValue,
        notes,
        score: status === 'OK' ? 100 : status === 'NA' ? null : 0
      },
      include: {
        inspection: {
          include: {
            items: true
          }
        },
        template: true
      }
    })

    // Recalculate inspection score
    const inspection = updatedItem.inspection
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
      where: { id: inspection.id },
      data: {
        score: newScore,
        status: mandatoryNotOk ? 'NEEDS_REWORK' : inspection.status
      }
    })

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Error updating inspection item:', error)
    return NextResponse.json({ error: 'Failed to update inspection item' }, { status: 500 })
  }
}