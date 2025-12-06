import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'

export async function GET() {
    try {
        // 1. Fetch Projects with End Dates (Deadlines)
        const projects = await prisma.project.findMany({
            where: {
                status: 'ACTIVE',
                endDate: {
                    not: null
                }
            },
            select: {
                id: true,
                name: true,
                code: true,
                endDate: true,
                clientName: true
            }
        })

        // 2. Fetch Inspections (Created Dates)
        // In a real schedule app, we might want a specific 'scheduledDate' field.
        // For now, we use createdAt to show when inspections happened/started.
        const inspections = await prisma.qCInspection.findMany({
            include: {
                project: {
                    select: {
                        name: true,
                        code: true
                    }
                },
                phase: {
                    select: {
                        name: true
                    }
                },
                inspector: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        // 3. Transform to Unified Event Format
        const events = [
            // Project Deadlines
            ...projects.map(p => ({
                id: `proj-${p.id}`,
                title: `Deadline: ${p.name}`,
                date: p.endDate,
                type: 'DEADLINE',
                projectId: p.id,
                projectName: p.name,
                description: `Client: ${p.clientName}`,
                status: 'PENDING'
            })),
            // Inspections
            ...inspections.map(i => ({
                id: `insp-${i.id}`,
                title: `Inspection: ${i.project.code} - ${i.phase.name}`,
                date: i.createdAt,
                type: 'INSPECTION',
                projectId: i.projectId,
                projectName: i.project.name,
                description: `Inspector: ${i.inspector.name}`,
                status: i.status
            }))
        ]

        // Sort by date descending (newest/future first)
        events.sort((a, b) => {
            const dateA = new Date(a.date!).getTime()
            const dateB = new Date(b.date!).getTime()
            return dateB - dateA
        })

        return NextResponse.json(events)
    } catch (error) {
        console.error('Error fetching schedule:', error)
        return NextResponse.json(
            { error: 'Failed to fetch schedule' },
            { status: 500 }
        )
    }
}
