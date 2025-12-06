import { db } from '@/lib/db'
import ProjectsClient from '@/components/projects/ProjectsClient'
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
      try {
        const { overallProgress, averageScore, activeIssues } = calculateProjectMetrics(project)

        // Base project data - explicitly pick only serializable fields
        const baseProjectData = {
          id: project.id,
          code: project.code,
          name: project.name,
          clientName: project.clientName,
          location: project.location,
          projectType: project.projectType,
          status: project.status,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
          startDate: project.startDate ? project.startDate.toISOString() : null,
          endDate: project.endDate ? project.endDate.toISOString() : null,
          overallProgress: overallProgress || 0,
          averageScore: averageScore || 0,
          activeIssues: activeIssues || 0,
        }

        // Handle case when no phases are defined
        if (allPhases.length === 0) {
          return {
            ...baseProjectData,
            phases: []
          }
        }

        const phaseNames = allPhases.map(p => p.name)
        const phaseStats = phaseNames.map(phaseName => {
          const phaseInspections = project.inspections.filter(i => i.phase?.name === phaseName)
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
            inspectionId: latestInspection?.id || null
          }
        })

        return {
          ...baseProjectData,
          phases: phaseStats
        }
      } catch (err) {
        console.error(`Error processing project ${project.id}:`, err)
        return null
      }
    }).filter(p => p !== null) as any[]

    return projectsWithStats
  } catch (error) {
    console.error('Error fetching projects:', error)
    return []
  }
}

export default async function ProjectsPage() {
  console.log('ProjectsPage: Starting render')
  try {
    const projects = await getProjects()
    console.log('ProjectsPage: Got projects', projects?.length)
    return <ProjectsClient initialProjects={projects} />
  } catch (error) {
    console.error('ProjectsPage: Error in component', error)
    throw error
  }
}