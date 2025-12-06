
export function calculateProjectMetrics(project: any) {
    let totalValidItems = 0
    let totalOKItems = 0
    let totalDoneItems = 0
    let activeIssuesCount = 0

    if (!project.inspections || !Array.isArray(project.inspections)) {
        return {
            overallProgress: 0,
            averageScore: 0,
            activeIssues: 0
        }
    }

    project.inspections.forEach((inspection: any) => {
        // Include DRAFT, SUBMITTED, APPROVED, NEEDS_REWORK, REJECTED
        if (['DRAFT', 'SUBMITTED', 'APPROVED', 'NEEDS_REWORK', 'REJECTED'].includes(inspection.status)) {
            const items = inspection.items || []
            const validItems = items.filter((i: any) => i.status !== 'NA')
            totalValidItems += validItems.length

            const okItems = validItems.filter((i: any) => i.status === 'OK')
            totalOKItems += okItems.length

            const doneItems = validItems.filter((i: any) => i.status === 'OK' || i.status === 'NOT_OK')
            totalDoneItems += doneItems.length

            const notOkItems = validItems.filter((i: any) => i.status === 'NOT_OK')
            activeIssuesCount += notOkItems.length
        }
    })

    // Calculate weighted scores
    // Quality Score = (Total OK Items / Total Valid Items) * 100
    const averageScore = totalValidItems > 0
        ? Math.round((totalOKItems / totalValidItems) * 100)
        : 0

    // Progress = (Total Done Items / Total Valid Items) * 100
    const overallProgress = totalValidItems > 0
        ? Math.round((totalDoneItems / totalValidItems) * 100)
        : 0

    return {
        overallProgress,
        averageScore,
        activeIssues: activeIssuesCount
    }
}
