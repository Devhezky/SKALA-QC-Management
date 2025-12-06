import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { perfexClient } from '@/lib/perfex-client'

export async function POST() {
    try {
        const staffList = await perfexClient.getAllStaff()

        const results = {
            total: staffList.length,
            created: 0,
            updated: 0,
            errors: 0
        }

        for (const staff of staffList) {
            try {
                const perfexId = parseInt(staff.staffid)
                const isActive = staff.active === '1'
                const role = staff.admin === '1' ? 'ADMIN' : 'QC' // Default mapping

                // Check if user exists by perfexId or email
                const existingUser = await db.user.findFirst({
                    where: {
                        OR: [
                            { perfexId: perfexId },
                            { email: staff.email }
                        ]
                    }
                })

                if (existingUser) {
                    await db.user.update({
                        where: { id: existingUser.id },
                        data: {
                            name: `${staff.firstname} ${staff.lastname}`,
                            perfexId: perfexId,
                            active: isActive,
                            // Don't downgrade admin to QC automatically if they were manually promoted locally, 
                            // but do promote if they became admin in Perfex.
                            // For simplicity, let's enforce Perfex role for now if they are admin.
                            role: staff.admin === '1' ? 'ADMIN' : existingUser.role
                        }
                    })
                    results.updated++
                } else {
                    await db.user.create({
                        data: {
                            email: staff.email,
                            name: `${staff.firstname} ${staff.lastname}`,
                            perfexId: perfexId,
                            active: isActive,
                            role: role,
                            password: '' // No local password initially
                        }
                    })
                    results.created++
                }
            } catch (err) {
                console.error(`Error syncing staff ${staff.email}:`, err)
                results.errors++
            }
        }

        return NextResponse.json({
            success: true,
            message: `Synced ${results.total} users. Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors}`,
            details: results
        })

    } catch (error) {
        console.error('Error syncing users:', error)
        return NextResponse.json(
            { error: 'Failed to sync users' },
            { status: 500 }
        )
    }
}
