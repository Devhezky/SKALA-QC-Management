import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params

        const notification = await db.notification.update({
            where: { id },
            data: { isRead: true }
        })

        return NextResponse.json(notification)
    } catch (error) {
        console.error('Error marking notification as read:', error)
        return NextResponse.json(
            { error: 'Failed to update notification' },
            { status: 500 }
        )
    }
}
