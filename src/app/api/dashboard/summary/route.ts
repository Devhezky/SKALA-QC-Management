import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

export async function GET() {
  try {
    // Use cache for dashboard summary
    const summary = await cache.getOrFetch(
      CACHE_KEYS.DASHBOARD_SUMMARY,
      async () => {
        // Get all projects with their statistics
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
        const projectsWithStats = projects.map(project => {
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

        // Calculate overall summary
        const totalProjects = projectsWithStats.length
        const averageProgress = totalProjects > 0
          ? Math.round(projectsWithStats.reduce((acc, p) => acc + p.overallProgress, 0) / totalProjects)
          : 0

        const avgScore = totalProjects > 0
          ? Math.round(projectsWithStats.reduce((acc, p) => acc + p.averageScore, 0) / totalProjects * 10) / 10
          : 0

        const totalProblems = projectsWithStats.reduce((acc, p) => acc + p.activeIssues, 0)

        // Get recent projects (last 5)
        const recentProjects = projectsWithStats.slice(0, 5)

        // Get projects with critical issues
        const projectsWithIssues = projectsWithStats.filter(p => p.activeIssues > 0)

        return {
          totalProjects,
          averageProgress,
          averageScore: avgScore,
          totalProblems,
          recentProjects,
          projectsWithIssues,
          allProjects: projectsWithStats
        }
      },
      CACHE_TTL.SHORT // 30 seconds cache
    )

    // Add cache headers for browser caching
    const response = NextResponse.json(summary)
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
    return response
  } catch (error) {
    console.error('Error fetching dashboard summary:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard summary' }, { status: 500 })
  }
}