import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

export async function GET() {
  try {
    // Use cache for projects list
    const projectsWithStats = await cache.getOrFetch(
      CACHE_KEYS.PROJECTS,
      async () => {
        const projects = await db.project.findMany({
          include: {
            inspections: {
              include: {
                phase: true,
                items: true
              }
            },
            _count: {
              select: {
                inspections: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        })

        // Get all phases from database
        const allPhases = await db.phase.findMany({
          orderBy: { order: 'asc' }
        })

        // Calculate project statistics
        return projects.map(project => {
          const phaseNames = allPhases.map(p => p.name)
          const phaseStats = phaseNames.map(phaseName => {
            const phaseInspections = project.inspections.filter(i => i.phase.name === phaseName)
            const latestInspection = phaseInspections.sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0]

            const phase = allPhases.find(p => p.name === phaseName)

            return {
              id: phase?.id || '',
              name: phaseName,
              score: latestInspection?.score || null,
              status: latestInspection?.status || 'NOT_STARTED',
              order: phase?.order || 0
            }
          })

          const completedPhases = phaseStats.filter(p => p.status === 'APPROVED').length
          const overallProgress = Math.round((completedPhases / phaseStats.length) * 100)

          const scores = phaseStats.filter(p => p.score !== null).map(p => p.score!)
          const averageScore = scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
            : 0

          const activeIssues = project.inspections
            .filter(i => i.status === 'SUBMITTED' || i.status === 'NEEDS_REWORK')
            .reduce((acc, inspection) => {
              const notOkItems = inspection.items.filter(item => item.status === 'NOT_OK')
              return acc + notOkItems.length
            }, 0)

          return {
            ...project,
            overallProgress,
            averageScore,
            activeIssues,
            phases: phaseStats
          }
        })
      },
      CACHE_TTL.SHORT // 30 seconds cache
    )

    // Add cache headers for browser caching
    const response = NextResponse.json(projectsWithStats)
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
    return response
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const project = await db.project.create({
      data: {
        code: data.code,
        name: data.name,
        clientName: data.clientName,
        location: data.location,
        projectType: data.projectType,
        createdById: data.createdById || 'default-user' // TODO: Get from auth
      }
    })

    // Invalidate projects cache after creating new project
    cache.invalidate(CACHE_KEYS.PROJECTS)

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
