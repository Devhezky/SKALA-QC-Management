import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const phaseId = searchParams.get('phaseId')

    const inspections = await db.qCInspection.findMany({
      where: {
        ...(projectId && { projectId }),
        ...(phaseId && { phaseId })
      },
      include: {
        project: true,
        phase: true,
        template: true,
        inspector: true,
        items: {
          include: {
            template: true,
            attachments: true
          }
        },
        signatures: {
          include: {
            signer: true
          }
        },
        attachments: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(inspections)
  } catch (error) {
    console.error('Error fetching inspections:', error)
    return NextResponse.json({ error: 'Failed to fetch inspections' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Get a valid user ID first
    const inspector = await db.user.findFirst({
      where: { role: 'QC' }
    })

    if (!inspector) {
      return NextResponse.json({ error: 'No QC user found' }, { status: 404 })
    }

    // Create inspection with items from template
    const template = await db.checklistTemplate.findUnique({
      where: { id: data.templateId },
      include: { items: true }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const inspection = await db.qCInspection.create({
      data: {
        projectId: data.projectId,
        phaseId: data.phaseId,
        templateId: data.templateId,
        inspectorId: inspector.id,
        status: 'DRAFT'
      },
      include: {
        items: true,
        project: true,
        phase: true,
        template: true
      }
    })

    // Create inspection items from template items
    const inspectionItems = await Promise.all(
      template.items
        .filter(item => item.phaseId === data.phaseId)
        .map(async (templateItem) => {
          return await db.qCInspectionItem.create({
            data: {
              inspectionId: inspection.id,
              templateItemId: templateItem.id,
              status: 'PENDING',
              isMandatory: templateItem.isMandatory,
              weight: templateItem.weight
            }
          })
        })
    )

    // Calculate initial score
    const totalWeight = inspectionItems.reduce((sum, item) => sum + item.weight, 0)
    const okWeight = inspectionItems
      .filter(item => item.status === 'OK')
      .reduce((sum, item) => sum + item.weight, 0)

    const score = totalWeight > 0 ? Math.round((okWeight / totalWeight) * 100 * 10) / 10 : 0

    const updatedInspection = await db.qCInspection.update({
      where: { id: inspection.id },
      data: { score },
      include: {
        items: {
          include: {
            template: true
          }
        },
        project: true,
        phase: true,
        template: true
      }
    })

    return NextResponse.json(updatedInspection)
  } catch (error) {
    console.error('Error creating inspection:', error)
    return NextResponse.json({ error: 'Failed to create inspection' }, { status: 500 })
  }
}
