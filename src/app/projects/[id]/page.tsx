import { db } from '@/lib/db'
import ProjectDetailClient from '@/components/projects/ProjectDetailClient'
import { notFound } from 'next/navigation'
import { calculateProjectMetrics } from '@/lib/utils/project-stats'

interface ProjectDetailPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
    const { id } = await params

    // Parallel queries for better performance
    const [project, templates, allPhases] = await Promise.all([
        db.project.findUnique({
            where: { id },
            include: {
                inspections: {
                    include: {
                        phase: true,
                        items: {
                            include: {
                                template: true
                            }
                        }
                    }
                }
            }
        }),
        db.checklistTemplate.findMany(),
        db.phase.findMany({ orderBy: { order: 'asc' } })
    ])

    if (!project) {
        return notFound()
    }

    // Transform data to match ProjectDetailClient props
    // Only show phases that have been added to this project (via inspections)
    const phases = project.inspections.map(inspection => ({
        id: inspection.phase.id,
        name: inspection.phase.name,
        description: inspection.phase.description,
        score: inspection.score,
        status: inspection.status,
        order: inspection.phase.order,
        inspectionId: inspection.id,
        items: inspection.items.map(item => ({
            id: item.id,
            title: item.template.title,
            status: item.status,
            isMandatory: item.template.isMandatory,
            notes: item.notes || null,
            photos: [] // Photos handled separately via attachments
        }))
    })).sort((a, b) => a.order - b.order)

    // Calculate metrics using shared utility
    const { overallProgress, averageScore, activeIssues } = calculateProjectMetrics(project)

    // Explicitly map serializable fields only - DO NOT spread Prisma objects
    const projectWithPhases = {
        id: project.id,
        code: project.code,
        name: project.name,
        description: project.description || '',
        clientName: project.clientName || '',
        location: project.location || '',
        projectType: project.projectType,
        status: project.status,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        startDate: project.startDate?.toISOString() || null,
        endDate: project.endDate?.toISOString() || null,
        totalValue: project.totalValue || 0,
        phases: phases,
        overallProgress,
        averageScore,
        activeIssues
    }

    // Serialize templates too
    const serializedTemplates = templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        projectType: t.projectType,
        version: t.version,
        isActive: t.isActive
    }))

    // Serialize phases
    const serializedPhases = allPhases.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        order: p.order
    }))

    return <ProjectDetailClient project={projectWithPhases} templates={serializedTemplates} allPhases={serializedPhases} />
}
