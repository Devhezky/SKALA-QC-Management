import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    // Get all inspections for the project (or all if no projectId specified)
    const inspections = await prisma.qCInspection.findMany({
      where: projectId ? { projectId } : {},
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        phase: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          include: {
            template: {
              select: {
                code: true,
                title: true,
                isMandatory: true
              }
            }
          }
        }
      }
    })

    // Collect all critical items (mandatory items with NOT_OK status)
    const criticalItems: Array<{
      id: string
      inspectionId: string
      phaseId: string
      phase: string
      item: string
      issue: string
      code: string
      projectId: string
      projectName: string
      projectCode: string
    }> = []

    inspections.forEach(inspection => {
      inspection.items.forEach(item => {
        if (item.template.isMandatory && item.status === 'NOT_OK') {
          criticalItems.push({
            id: item.id,
            inspectionId: inspection.id,
            phaseId: inspection.phase.id,
            phase: inspection.phase.name,
            item: item.template.title,
            issue: item.notes || 'Item wajib tidak lulus pemeriksaan',
            code: item.template.code,
            projectId: inspection.project.id,
            projectName: inspection.project.name,
            projectCode: inspection.project.code
          })
        }
      })
    })

    return NextResponse.json(criticalItems)
  } catch (error) {
    console.error('Error fetching critical issues:', error)
    return NextResponse.json(
      { error: 'Failed to fetch critical issues' },
      { status: 500 }
    )
  }
}
