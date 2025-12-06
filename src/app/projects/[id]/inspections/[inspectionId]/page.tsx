import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import InspectionClient from '@/components/inspections/InspectionClient'

interface InspectionPageProps {
    params: Promise<{
        id: string
        inspectionId: string
    }>
}

export default async function InspectionPage({ params }: InspectionPageProps) {
    const { id, inspectionId } = await params

    const inspection = await db.qCInspection.findUnique({
        where: { id: inspectionId },
        include: {
            project: true,
            phase: true,
            template: true,
            items: {
                include: {
                    template: true,
                    attachments: true
                },
                orderBy: {
                    template: {
                        code: 'asc'
                    }
                }
            }
        }
    })

    if (!inspection) {
        notFound()
    }

    // If items are empty, we might need to seed them from the template
    // This logic could also be in the action that creates the inspection
    if (inspection.items.length === 0) {
        const templateItems = await db.checklistItemTemplate.findMany({
            where: { templateId: inspection.templateId, phaseId: inspection.phaseId }
        })

        // We can't easily create them here in a server component without a mutation
        // So we'll pass the template items to the client to render, 
        // or handle the seeding in the create action.
        // For now, let's assume the create action or a separate step handles seeding.
        // Or we can just render the form based on template items if inspection items don't exist?
        // Better to have inspection items.
    }

    return <InspectionClient inspection={inspection} />
}
