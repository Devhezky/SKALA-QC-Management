import { db } from '@/lib/db'
import DashboardClient from '@/components/dashboard/DashboardClient'
import { calculateProjectMetrics } from '@/lib/utils/project-stats'

// Force dynamic rendering since we are fetching data that changes
export const dynamic = 'force-dynamic'

async function getProjects() {
  try {
    // Parallel queries for better performance
    const [projects, allPhases] = await Promise.all([
      db.project.findMany({
        include: {
          inspections: {
            include: {
              phase: true,
              items: {
                select: {
                  status: true
                }
              }
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
      }),
      db.phase.findMany({ orderBy: { order: 'asc' } })
    ])

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
          order: phase?.order || 0,
          inspectionId: latestInspection?.id
        }
      })

      const { overallProgress, averageScore, activeIssues } = calculateProjectMetrics(project)

      return {
        ...project,
        overallProgress,
        averageScore,
        activeIssues,
        phases: phaseStats
      }
    })

    return projectsWithStats
  } catch (error) {
    console.error('Error fetching projects:', error)
    return []
  }
}

async function getCriticalIssues(projectId?: string) {
  try {
    const inspections = await db.qCInspection.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        items: {
          some: {
            status: 'NOT_OK',
            template: {
              isMandatory: true
            }
          }
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        phase: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          where: {
            status: 'NOT_OK',
            template: {
              isMandatory: true
            }
          },
          include: {
            template: {
              select: {
                code: true,
                title: true,
                isMandatory: true
              }
            }
          }
        }
      }
    })

    // Collect all critical items (mandatory items with NOT_OK status)
    const criticalItems: Array<{
      id: string
      inspectionId: string
      phaseId: string
      phase: string
      item: string
      issue: string
      code: string
      projectId: string
      projectName: string
      projectCode: string
    }> = []

    inspections.forEach(inspection => {
      inspection.items.forEach(item => {
        // Double check in case the DB filter missed something (unlikely with correct query)
        if (item.template.isMandatory && item.status === 'NOT_OK') {
          criticalItems.push({
            id: item.id,
            inspectionId: inspection.id,
            phaseId: inspection.phase.id,
            phase: inspection.phase.name,
            item: item.template.title,
            issue: item.notes || 'Item wajib tidak lulus pemeriksaan',
            code: item.template.code,
            projectId: inspection.project.id,
            projectName: inspection.project.name,
            projectCode: inspection.project.code
          })
        }
      })
    })

    return criticalItems
  } catch (error) {
    console.error('Error fetching critical issues:', error)
    return []
  }
}

export default async function DashboardPage() {
  const projects = await getProjects()

  // Optimization: Only fetch critical issues for the first project initially
  // to match the default selected project behavior
  let criticalIssues: any[] = []
  if (projects.length > 0) {
    criticalIssues = await getCriticalIssues(projects[0].id)
  }

  return (
    <DashboardClient
      initialProjects={projects}
      initialCriticalIssues={criticalIssues}
    />
  )
}

