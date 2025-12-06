import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    const whereClause: any = {
      status: 'SUBMITTED' // Status untuk inspeksi yang sudah di-submit tapi belum di-review
    }

    if (projectId) {
      whereClause.projectId = projectId
    }

    const inspections = await prisma.qCInspection.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            clientName: true
          }
        },
        phase: {
          select: {
            id: true,
            name: true
          }
        },
        inspector: {
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
        },
        signatures: {
          include: {
            signer: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    })

    // Calculate score and statistics for each inspection
    const inspectionsWithStats = inspections.map(inspection => {
      const okItems = inspection.items.filter(item => item.status === 'OK')
      const notOkItems = inspection.items.filter(item => item.status === 'NOT_OK')
      const naItems = inspection.items.filter(item => item.status === 'NA')
      
      // Calculate score based on mandatory items
      const mandatoryItems = inspection.items.filter(item => item.template.isMandatory)
      const mandatoryOk = mandatoryItems.filter(item => item.status === 'OK')
      const score = mandatoryItems.length > 0 
        ? Math.round((mandatoryOk.length / mandatoryItems.length) * 100)
        : 0

      return {
        id: inspection.id,
        project: inspection.project,
        phase: inspection.phase,
        inspector: inspection.inspector,
        status: inspection.status,
        score,
        comments: inspection.comments,
        submittedAt: inspection.submittedAt?.toISOString() || new Date().toISOString(),
        createdAt: inspection.createdAt.toISOString(),
        updatedAt: inspection.updatedAt.toISOString(),
        statistics: {
          totalItems: inspection.items.length,
          okItems: okItems.length,
          notOkItems: notOkItems.length,
          naItems: naItems.length,
          mandatoryItems: mandatoryItems.length,
          mandatoryNotOk: mandatoryItems.filter(item => item.status === 'NOT_OK').length
        },
        items: inspection.items.map(item => ({
          id: item.id,
          template: item.template,
          status: item.status,
          measuredValue: item.measuredValue,
          notes: item.notes,
          isMandatory: item.template.isMandatory
        })),
        signatures: inspection.signatures.map(sig => ({
          id: sig.id,
          signer: sig.signer,
          signerRole: sig.signerRole,
          status: sig.status,
          comments: sig.comments,
          signedAt: sig.signedAt?.toISOString()
        }))
      }
    })

    return NextResponse.json(inspectionsWithStats)
  } catch (error) {
    console.error('Error fetching pending inspections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending inspections' },
      { status: 500 }
    )
  }
}
