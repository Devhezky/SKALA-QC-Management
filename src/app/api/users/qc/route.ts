import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const user = await db.user.findFirst({
            where: { role: 'QC' }
        })

        if (!user) {
            return NextResponse.json({ user: null }, { status: 404 })
        }

        return NextResponse.json({ user })
    } catch (error) {
        console.error('Failed to fetch QC user:', error)
        return NextResponse.json({ error: 'Failed to fetch QC user' }, { status: 500 })
    }
}
