import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { perfexClient } from '@/lib/perfex-client'

export async function POST() {
    try {
        // 1. Fetch projects from Perfex
        const perfexProjects = await perfexClient.getProjects()

        if (!perfexProjects || perfexProjects.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No projects found in Perfex to sync',
                stats: { added: 0, updated: 0 }
            })
        }

        let added = 0
        let updated = 0

        // 2. Sync with local database
        for (const pProject of perfexProjects) {
            // Map Perfex status to local status
            let status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED' = 'ACTIVE'
            switch (pProject.status) {
                case 1: // Not Started
                case 2: // In Progress
                    status = 'ACTIVE'
                    break
                case 3: // On Hold
                    status = 'ON_HOLD'
                    break
                case 4: // Finished
                    status = 'COMPLETED'
                    break
                case 5: // Cancelled
                    status = 'CANCELLED'
                    break
            }

            // Check if project exists by perfexId
            const existingProject = await db.project.findUnique({
                where: { perfexId: pProject.id }
            })

            if (existingProject) {
                // Update
                await db.project.update({
                    where: { id: existingProject.id },
                    data: {
                        name: pProject.name,
                        description: pProject.description,
                        clientName: pProject.company || 'Unknown Client',
                        clientId: pProject.clientid,
                        status: status,
                        startDate: pProject.start_date ? new Date(pProject.start_date) : null,
                        endDate: pProject.deadline ? new Date(pProject.deadline) : null,
                        totalValue: pProject.project_cost,
                    }
                })
                updated++
            } else {
                // Create new
                // We need a code. Perfex doesn't always have a code, so we generate one or use ID
                const code = `PX-${pProject.id}`

                // Ensure code is unique
                const existingCode = await db.project.findUnique({ where: { code } })
                const finalCode = existingCode ? `${code}-${Date.now()}` : code

                await db.project.create({
                    data: {
                        perfexId: pProject.id,
                        code: finalCode,
                        name: pProject.name,
                        description: pProject.description,
                        clientName: pProject.company || 'Unknown Client',
                        clientId: pProject.clientid,
                        location: 'TBD', // Perfex might not have location in basic fields
                        projectType: 'General', // Default
                        status: status,
                        startDate: pProject.start_date ? new Date(pProject.start_date) : null,
                        endDate: pProject.deadline ? new Date(pProject.deadline) : null,
                        totalValue: pProject.project_cost,
                        // Note: createdById is required in schema. We need a default user or system user.
                        // For now, let's try to find an admin or first user.
                        createdBy: {
                            connect: {
                                email: 'admin@narapati.com' // Using a known existing user
                            }
                        }
                    }
                })
                console.log(`Created project: ${pProject.name}`)
                added++
            }
        }

        return NextResponse.json({
            success: true,
            message: `Sync completed. Added ${added}, Updated ${updated} projects.`,
            stats: { added, updated },
            details: {
                projectsFound: perfexProjects.length,
                projects: perfexProjects
            }
        })

    } catch (error) {
        console.error('Error syncing projects:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
