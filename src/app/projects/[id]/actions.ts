'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getProjectDetails(id: string) {
    return await db.project.findUnique({
        where: { id },
        include: {
            inspections: {
                include: {
                    phase: true,
                    inspector: true
                }
            },
            members: true
        }
    })
}

export async function getTemplates() {
    return await db.checklistTemplate.findMany()
}

export async function createInspection(data: {
    projectId: string
    phaseId?: string // If we had a Phase model linked to Project
    name: string
    description?: string
    inspectorId: string
}) {
    // Since we don't have a direct link between Phase and Project in the schema yet (Phase is master data),
    // and QCInspection links to Phase and Project.
    // We need to ensure we have a Phase ID.
    // For now, let's assume we are creating an inspection for a generic phase.

    // Note: The schema for QCInspection requires `phaseId`.
    // If we are "Adding a Phase" to a project, effectively we are creating an inspection record 
    // that represents that phase's execution for this project.

    if (!data.phaseId) {
        throw new Error('Phase ID is required')
    }

    // Check if inspection already exists
    const existingInspection = await db.qCInspection.findFirst({
        where: {
            projectId: data.projectId,
            phaseId: data.phaseId
        }
    })

    if (existingInspection) {
        return existingInspection
    }

    // Get the default template
    const defaultTemplate = await db.checklistTemplate.findFirst({
        orderBy: { createdAt: 'asc' }
    })

    if (!defaultTemplate) {
        throw new Error('No template found in database. Please create a template first.')
    }

    const inspection = await db.qCInspection.create({
        data: {
            projectId: data.projectId,
            phaseId: data.phaseId,
            inspectorId: data.inspectorId,
            templateId: defaultTemplate.id,
            status: 'DRAFT',
        }
    })

    revalidatePath(`/projects/${data.projectId}`)
    return inspection
}

export async function createTemplate(data: {
    name: string
    description?: string
    projectType?: string
    items: { description: string }[]
}) {
    const template = await db.checklistTemplate.create({
        data: {
            name: data.name,
            description: data.description,
            projectType: data.projectType,
            items: {
                create: data.items
            }
        }
    })

    revalidatePath('/projects') // Revalidate where templates are used
    return template
}

export async function createPhase(data: {
    name: string
    description?: string
}) {
    // Get the last order
    const lastPhase = await db.phase.findFirst({
        orderBy: { order: 'desc' }
    })
    const order = (lastPhase?.order || 0) + 1

    const phase = await db.phase.create({
        data: {
            name: data.name,
            description: data.description,
            order
        }
    })

    revalidatePath('/projects')
    return phase
}

export async function createPhaseWithItems(data: {
    projectId: string
    phaseId?: string
    newPhase?: {
        name: string
        description: string
    }
    items: {
        title: string
        criteria: string
        checkMethod: string
        isMandatory: boolean
    }[]
}) {
    let phaseId = data.phaseId

    console.log('createPhaseWithItems started', { projectId: data.projectId, phaseId, newPhase: data.newPhase, itemsCount: data.items.length })

    // 1. Create Phase if needed
    if (!phaseId && data.newPhase) {
        console.log('Checking/Creating phase...', data.newPhase.name)

        // Check if phase already exists by name
        const existingPhase = await db.phase.findUnique({
            where: { name: data.newPhase.name }
        })

        if (existingPhase) {
            console.log('Phase already exists, using id:', existingPhase.id)
            phaseId = existingPhase.id
        } else {
            console.log('Creating new phase...')
            const lastPhase = await db.phase.findFirst({
                orderBy: { order: 'desc' }
            })
            const order = (lastPhase?.order || 0) + 1

            const phase = await db.phase.create({
                data: {
                    name: data.newPhase.name,
                    description: data.newPhase.description,
                    order
                }
            })
            phaseId = phase.id
            console.log('New phase created', phaseId)
        }
    }

    if (!phaseId) throw new Error('Phase ID is required')

    // 2. Create Template for these items (Ad-hoc template)
    console.log('Creating template...')
    const template = await db.checklistTemplate.create({
        data: {
            name: `Custom QC - ${new Date().toLocaleDateString()}`,
            description: 'Custom QC items added from project',
            projectType: 'Custom',
            items: {
                create: data.items.map((item, index) => ({
                    phaseId: phaseId!,
                    code: `${index + 1}`,
                    title: item.title,
                    acceptanceCriteria: item.criteria,
                    checkMethod: item.checkMethod,
                    isMandatory: item.isMandatory,
                    weight: 1
                }))
            }
        }
    })
    console.log('Template created', template.id)

    // 3. Create Inspection
    // We need a default inspector ID - get the first QC user
    const inspectorUser = await db.user.findFirst({
        where: { role: 'QC' }
    })

    if (!inspectorUser) {
        throw new Error('No QC inspector found in database. Please create a user with role QC.')
    }

    const inspectorId = inspectorUser.id

    console.log('Creating inspection...')
    const inspection = await db.qCInspection.create({
        data: {
            projectId: data.projectId,
            phaseId: phaseId,
            templateId: template.id,
            inspectorId,
            status: 'DRAFT',
        }
    })
    console.log('Inspection created', inspection.id)

    // 4. Create Inspection Items (Seed from template)
    // We need to fetch the created template items first to link them
    const templateItems = await db.checklistItemTemplate.findMany({
        where: { templateId: template.id }
    })
    console.log('Template items found', templateItems.length)

    if (templateItems.length > 0) {
        await db.qCInspectionItem.createMany({
            data: templateItems.map(ti => ({
                inspectionId: inspection.id,
                templateItemId: ti.id,
                status: 'PENDING',
                isMandatory: ti.isMandatory,
                weight: ti.weight
            }))
        })
        console.log('Inspection items created')
    } else {
        console.warn('No template items found to create inspection items')
    }

    revalidatePath(`/projects/${data.projectId}`)
    return inspection
}

export async function createFullTemplate(data: {
    name: string
    description: string
    projectType: string
    phases: {
        name: string
        items: {
            title: string
            criteria: string
            checkMethod: string
            isMandatory: boolean
        }[]
    }[]
}) {
    console.log('createFullTemplate started', { name: data.name, phasesCount: data.phases.length })

    try {
        // 1. Create Template
        const template = await db.checklistTemplate.create({
            data: {
                name: data.name,
                description: data.description,
                projectType: data.projectType,
                isActive: true,
                version: '1.0'
            }
        })
        console.log('Template created', template.id)

        // 2. Process Phases and Items
        for (const phaseData of data.phases) {
            console.log('Processing phase', phaseData.name)
            // Find or create phase
            let phase = await db.phase.findUnique({
                where: { name: phaseData.name }
            })

            if (!phase) {
                console.log('Creating new phase', phaseData.name)
                const lastPhase = await db.phase.findFirst({
                    orderBy: { order: 'desc' }
                })
                const order = (lastPhase?.order || 0) + 1
                phase = await db.phase.create({
                    data: {
                        name: phaseData.name,
                        description: `Phase for ${data.name}`,
                        order
                    }
                })
            }
            console.log('Phase ready', phase.id)

            // Create Items for this phase
            if (phaseData.items.length > 0) {
                console.log('Creating items for phase', phase.id, phaseData.items.length)
                await db.checklistItemTemplate.createMany({
                    data: phaseData.items.map((item, index) => ({
                        templateId: template.id,
                        phaseId: phase!.id,
                        code: `${phase!.name.substring(0, 3).toUpperCase()}-${index + 1}`,
                        title: item.title,
                        acceptanceCriteria: item.criteria,
                        checkMethod: item.checkMethod,
                        isMandatory: item.isMandatory,
                        weight: 1
                    }))
                })
            }
        }

        revalidatePath('/projects')
        return template
    } catch (error) {
        console.error('Error in createFullTemplate:', error)
        throw error
    }
}

export async function getTemplateDetails(templateId: string) {
    const template = await db.checklistTemplate.findUnique({
        where: { id: templateId },
        include: {
            items: {
                include: {
                    phase: true
                }
            }
        }
    })

    if (!template) return null

    // Transform to nested structure for the dialog
    const phasesMap = new Map<string, { name: string; items: any[] }>()

    template.items.forEach(item => {
        const phaseName = item.phase.name
        if (!phasesMap.has(phaseName)) {
            phasesMap.set(phaseName, { name: phaseName, items: [] })
        }
        phasesMap.get(phaseName)!.items.push({
            title: item.title,
            criteria: item.acceptanceCriteria,
            checkMethod: item.checkMethod,
            isMandatory: item.isMandatory
        })
    })

    return {
        id: template.id,
        name: template.name,
        description: template.description || '',
        projectType: template.projectType,
        phases: Array.from(phasesMap.values())
    }
}

export async function updateInspectionItem(itemId: string, data: {
    status?: 'OK' | 'NOT_OK' | 'NA' | 'PENDING'
    notes?: string
}) {
    const item = await db.qCInspectionItem.update({
        where: { id: itemId },
        data: {
            ...data,
            score: data.status === 'OK' ? 100 : data.status === 'NOT_OK' ? 0 : undefined
        }
    })

    revalidatePath(`/projects`)
    return item
}

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function uploadAttachment(formData: FormData) {
    const file = formData.get('file') as File
    const itemId = formData.get('itemId') as string
    const inspectionId = formData.get('inspectionId') as string

    // Get the first user as uploader (ideally this should come from auth)
    const user = await db.user.findFirst()
    const uploadedById = user?.id || 'unknown'

    if (!file) {
        throw new Error('No file uploaded')
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
    const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const filePath = join(uploadDir, filename)
    await writeFile(filePath, buffer)

    let fileType = 'DOCUMENT'
    if (file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) fileType = 'PHOTO'
    if (file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|avi|mkv)$/i)) fileType = 'VIDEO'
    // Note: WAV is audio, but we don't have AUDIO type yet. Treat as DOCUMENT or add AUDIO type.
    // For now, let's keep it as DOCUMENT unless we migrate schema.

    const attachment = await db.attachment.create({
        data: {
            itemId: itemId || undefined,
            inspectionId: inspectionId || undefined,
            filename: file.name,
            filePath: `/uploads/${filename}`,
            fileType: fileType as any,
            uploadedById
        }
    })

    revalidatePath(`/projects`)
    return attachment
}

export async function deleteAttachment(attachmentId: string) {
    await db.attachment.delete({
        where: { id: attachmentId }
    })
    revalidatePath(`/projects`)
}

export async function updateInspectionStatus(inspectionId: string, status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'NEEDS_REWORK') {
    const inspection = await db.qCInspection.update({
        where: { id: inspectionId },
        data: {
            status,
            submittedAt: status === 'SUBMITTED' ? new Date() : undefined
        }
    })

    revalidatePath(`/projects`)
    return inspection
}

export async function deleteInspection(inspectionId: string) {
    await db.qCInspection.delete({
        where: { id: inspectionId }
    })
    revalidatePath(`/projects`)
}

export async function deleteTemplate(templateId: string) {
    await db.checklistTemplate.delete({
        where: { id: templateId }
    })
    revalidatePath(`/projects`)
}

export async function createSignature(data: {
    inspectionId: string
    signedById: string
    signatureData: string // Base64
}) {
    // Get user to fetch role
    const user = await db.user.findUnique({
        where: { id: data.signedById }
    })

    if (!user) {
        throw new Error('User not found')
    }

    // 1. Create Signature record
    const signature = await db.signature.create({
        data: {
            inspectionId: data.inspectionId,
            signerId: data.signedById,
            signerRole: user.role,
            signatureData: data.signatureData,
            signedAt: new Date(),
            status: 'APPROVED' // Auto-approve QC signature
        }
    })

    // 2. Update Inspection status to SUBMITTED
    await db.qCInspection.update({
        where: { id: data.inspectionId },
        data: {
            status: 'SUBMITTED',
            submittedAt: new Date()
        }
    })

    revalidatePath(`/projects`)
    return signature
}
