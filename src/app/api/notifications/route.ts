import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Mock user ID for now since we don't have full auth session yet
// In a real app, this would come from the session
const MOCK_USER_ID = 'user-1'

export async function GET() {
    try {
        // In a real app, get userId from session
        // const session = await getServerSession(authOptions)
        // const userId = session?.user?.id

        // For now, we'll fetch notifications for the first user found or a specific ID
        // To make it work for testing, let's just fetch all notifications for now or filter by a test ID

        const notifications = await db.notification.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            take: 20
        })

        return NextResponse.json(notifications)
    } catch (error) {
        console.error('Error fetching notifications:', error)
        return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { userId, title, message, type, link } = body

        const notification = await db.notification.create({
            data: {
                userId,
                title,
                message,
                type: type || 'INFO',
                link
            }
        })

        return NextResponse.json(notification)
    } catch (error) {
        console.error('Error creating notification:', error)
        return NextResponse.json(
            { error: 'Failed to create notification' },
            { status: 500 }
        )
    }
}
