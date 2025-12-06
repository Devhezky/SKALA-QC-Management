import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const inspection = await prisma.qCInspection.findUnique({
      where: { id },
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
                id: true,
                code: true,
                title: true,
                acceptanceCriteria: true,
                checkMethod: true,
                isMandatory: true,
                weight: true,
                requirePhoto: true,
                requireValue: true
              }
            },
            attachments: true
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
      }
    })

    if (!inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      )
    }

    // Calculate score and statistics
    const items = inspection.items
    const okItems = items.filter(item => item.status === 'OK')
    const notOkItems = items.filter(item => item.status === 'NOT_OK')
    const naItems = items.filter(item => item.status === 'NA')
    
    // Calculate score based on mandatory items
    const mandatoryItems = items.filter(item => item.template.isMandatory)
    const mandatoryOk = mandatoryItems.filter(item => item.status === 'OK')
    const score = mandatoryItems.length > 0 
      ? Math.round((mandatoryOk.length / mandatoryItems.length) * 100)
      : 0

    const inspectionWithStats = {
      id: inspection.id,
      project: inspection.project,
      phase: inspection.phase,
      inspector: inspection.inspector,
      status: inspection.status,
      score,
      comments: inspection.comments,
      submittedAt: inspection.submittedAt?.toISOString(),
      createdAt: inspection.createdAt.toISOString(),
      updatedAt: inspection.updatedAt.toISOString(),
      statistics: {
        totalItems: items.length,
        okItems: okItems.length,
        notOkItems: notOkItems.length,
        naItems: naItems.length,
        mandatoryItems: mandatoryItems.length,
        mandatoryNotOk: mandatoryItems.filter(item => item.status === 'NOT_OK').length
      },
      items: items.map(item => ({
        id: item.id,
        template: item.template,
        status: item.status,
        measuredValue: item.measuredValue,
        notes: item.notes,
        attachments: item.attachments.map(att => ({
          id: att.id,
          filename: att.filename,
          filePath: att.filePath,
          fileType: att.fileType
        }))
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

    return NextResponse.json(inspectionWithStats)
  } catch (error) {
    console.error('Error fetching inspection:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inspection' },
      { status: 500 }
    )
  }
}
