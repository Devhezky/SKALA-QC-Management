import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
    try {
        const body = await req.json()

        // Generate a project code (e.g., PRJ-2023-001)
        // For simplicity, using a random string or timestamp based code for now
        const code = `PRJ-${Date.now().toString().slice(-6)}`

        // In a real app, you would get the current user ID from the session
        // For now, we'll fetch the first user or create a dummy one if none exists
        let user = await db.user.findFirst()
        if (!user) {
            user = await db.user.create({
                data: {
                    email: 'admin@example.com',
                    name: 'Admin',
                    role: 'ADMIN'
                }
            })
        }

        const project = await db.project.create({
            data: {
                code,
                name: body.name,
                clientName: body.clientName,
                location: 'Jakarta', // Default for now as it's not in the form
                projectType: 'Interior', // Default
                status: 'ACTIVE', // Default mapping from form status
                billingType: body.billingType,
                totalValue: body.totalValue ? parseFloat(body.totalValue) : null,
                estimatedHours: body.estimatedHours ? parseFloat(body.estimatedHours) : null,
                startDate: body.startDate ? new Date(body.startDate) : null,
                endDate: body.endDate ? new Date(body.endDate) : null,
                tags: body.tags,
                description: body.description,
                calculateProgressByTasks: body.calculateProgressByTasks,
                sendProjectEmail: body.sendProjectEmail,
                createdById: user.id,
                // Handle members if needed, for now ignoring relation as it requires User IDs
            },
        })

        return NextResponse.json(project)
    } catch (error) {
        console.error('Error creating project:', error)
        return new NextResponse('Internal Error', { status: 500 })
    }
}
