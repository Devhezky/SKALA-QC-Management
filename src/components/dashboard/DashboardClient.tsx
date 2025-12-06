'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamic imports for heavy components
const ChecklistExecution = dynamic(() => import('@/components/checklist/ChecklistExecution'), {
    loading: () => <div className="p-8 text-center">Loading checklist...</div>
})
const DashboardClientV2 = dynamic(() => import('@/components/dashboard/DashboardClientV2'), {
    loading: () => <div className="p-8 text-center">Loading dashboard...</div>
})

interface Project {
    id: string
    code: string
    name: string
    clientName: string
    location: string
    projectType: string
    status: string
    overallProgress: number
    averageScore: number
    activeIssues: number
    // Perfex Fields
    description?: string
    startDate?: string | Date
    endDate?: string | Date
    totalValue?: number
    perfexId?: number
    phases: Array<{
        id: string
        name: string
        score: number | null
        status: string
        order: number
        inspectionId?: string
    }>
}

interface CriticalIssue {
    id: string
    phase: string
    item: string
    issue: string
    phaseId?: string
    inspectionId?: string
}

interface DashboardClientProps {
    initialProjects: Project[]
    initialCriticalIssues: CriticalIssue[]
}

export default function DashboardClient({ initialProjects, initialCriticalIssues }: DashboardClientProps) {
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>(initialProjects)
    const [criticalIssues, setCriticalIssues] = useState<CriticalIssue[]>(initialCriticalIssues)
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)
    const [showChecklist, setShowChecklist] = useState(false)
    const [selectedPhase, setSelectedPhase] = useState<any>(null)

    const startChecklist = (phase: any) => {
        setSelectedPhase(phase)
        // We need to find the project associated with this phase to pass to ChecklistExecution
        // This assumes that the phase object might not directly contain the full project.
        // In DashboardClientV2, when a phase is clicked, it should ideally pass the project context.
        // For now, we'll rely on `selectedProject` being set by `onExportReport` or `onViewProject`
        // or assume `DashboardClientV2` will set it before calling `onStartChecklist`.
        // A more robust solution would be for `onStartChecklist` in `DashboardClientV2` to pass the project ID or the full project object.
        setShowChecklist(true)
    }

    const backToDashboard = () => {
        setShowChecklist(false)
        setSelectedPhase(null)
        refreshData()
    }

    const refreshData = async () => {
        try {
            const response = await fetch('/api/projects')
            if (response.ok) {
                const data = await response.json()
                setProjects(data)
                // If selectedProject exists, update it to reflect latest data
                if (selectedProject) {
                    const updatedProject = data.find((p: Project) => p.id === selectedProject.id)
                    if (updatedProject) setSelectedProject(updatedProject)
                }
            }
            // Also refresh critical issues if a project is selected
            if (selectedProject) {
                const responseIssues = await fetch(`/api/critical-issues?projectId=${selectedProject.id}`)
                if (responseIssues.ok) {
                    const dataIssues = await responseIssues.json()
                    setCriticalIssues(dataIssues)
                }
            }
        } catch (error) {
            console.error('Error refreshing data:', error)
        }
    }

    const exportAllReports = async (includeAI: boolean = false) => {
        if (selectedProject) {
            try {
                // Get AI settings if needed
                let aiSettings = null;
                if (includeAI) {
                    if (typeof window !== 'undefined') {
                        const settings = localStorage.getItem('aiSettings');
                        if (settings) {
                            aiSettings = JSON.parse(settings);
                        }
                    }
                }

                // Create form data for POST request
                const formData = new FormData();
                formData.append('includeAI', includeAI.toString());
                if (aiSettings) {
                    formData.append('aiSettings', JSON.stringify(aiSettings));
                }

                // Create and submit form
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = `/api/reports/project/${selectedProject.id}`;
                form.style.display = 'none';

                formData.forEach((value, key) => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = typeof value === 'string' ? value : String(value);
                    form.appendChild(input);
                });

                document.body.appendChild(form);
                form.submit();
                document.body.removeChild(form);
            } catch (error) {
                console.error('Error exporting reports:', error);
                // Fallback to GET request
                const url = `/api/reports/project/${selectedProject.id}${includeAI ? '?includeAI=true' : ''}`
                window.open(url, '_blank')
            }
        }
    }

    if (showChecklist && selectedPhase && selectedProject) {
        return <ChecklistExecution
            project={selectedProject}
            phase={selectedPhase}
            onBack={backToDashboard}
        />
    }

    return (
        <DashboardClientV2
            projects={projects}
            criticalIssues={criticalIssues}
            onSwitchVersion={() => { }} // No longer needed
            onStartChecklist={(phase) => {
                // For now, we assume V2 handles project selection or we need to find it.
                // Since we don't have the project here easily without V2 passing it,
                // and the user wants to remove legacy code, we might need to revisit checklist execution flow.
                // But for now, let's just try to start it.
                startChecklist(phase)
            }}
            onExportReport={(project, includeAI) => {
                setSelectedProject(project)
                exportAllReports(includeAI)
            }}
            onViewProject={(project) => {
                router.push(`/projects/${project.id}`)
            }}
        />
    )
}
