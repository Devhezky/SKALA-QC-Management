'use client'

import { useState, useEffect } from 'react'

import {
    LayoutDashboard,
    FolderKanban,
    FileText,
    Settings,
    Search,
    Filter,
    MoreVertical,
    Plus,
    Calendar,
    Bell,
    ChevronDown,
    LogOut,
    CheckCircle2,
    AlertCircle,
    Clock,
    XCircle,
    ArrowRight,
    Eye,
    Download,
    Brain,
    TrendingUp,
    Users,
    AlertTriangle,
    RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useRouter } from 'next/navigation'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'

// Interfaces (matching V1)
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

interface DashboardSummary {
    totalProjects: number
    averageProgress: number
    averageScore: number
    totalProblems: number
    recentProjects: Project[]
    projectsWithIssues: Project[]
    allProjects: Project[]
}

interface DashboardClientV2Props {
    projects: Project[]
    criticalIssues: CriticalIssue[]
    onSwitchVersion: () => void
    onStartChecklist: (phase: any) => void
    onExportReport: (project: Project, includeAI: boolean) => void
    onViewProject: (project: Project) => void
}

export default function DashboardClientV2({
    projects,
    criticalIssues,
    onSwitchVersion,
    onStartChecklist,
    onExportReport,
    onViewProject
}: DashboardClientV2Props) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)
    const [currentView, setCurrentView] = useState<'dashboard' | 'projects' | 'project-detail'>('dashboard')
    const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)
    const [isSyncing, setIsSyncing] = useState(false)
    const [recentSubmittedQC, setRecentSubmittedQC] = useState<any[]>([])

    useEffect(() => {
        fetchDashboardSummary()
        fetchRecentSubmittedQC()
    }, [])

    const fetchDashboardSummary = async () => {
        try {
            const response = await fetch('/api/dashboard/summary')
            if (response.ok) {
                const data = await response.json()
                setDashboardSummary(data)
            }
        } catch (error) {
            console.error('Error fetching dashboard summary:', error)
        }
    }

    const fetchRecentSubmittedQC = async () => {
        try {
            const response = await fetch('/api/inspections/pending')
            if (response.ok) {
                const data = await response.json()
                setRecentSubmittedQC(data.slice(0, 5)) // Show only last 5
            }
        } catch (error) {
            console.error('Error fetching recent submitted QC:', error)
        }
    }

    const handleSync = async () => {
        setIsSyncing(true)
        try {
            const response = await fetch('/api/perfex/import-projects', { method: 'POST' })
            const data = await response.json()

            if (data.success) {
                toast.success(data.message)
                fetchDashboardSummary()
                router.refresh()
            } else {
                toast.error('Import failed: ' + (data.error || data.details))
            }
        } catch (error) {
            toast.error('Import failed')
        } finally {
            setIsSyncing(false)
        }
    }

    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.clientName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = selectedStatus ? project.status === selectedStatus : true
        return matchesSearch && matchesStatus
    })

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">Approved</Badge>
            case 'NEEDS_REWORK':
                return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none">Needs Rework</Badge>
            case 'IN_PROGRESS':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">In Progress</Badge>
            case 'NOT_STARTED':
                return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-none">Not Started</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="h-full bg-gray-50 font-sans">
            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 px-4 py-4 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                        <p className="text-sm text-gray-500 mt-1">Welcome back, Inspector</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="gap-2 w-full sm:w-auto justify-center"
                        >
                            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Syncing...' : 'Sync Projects'}
                        </Button>
                        <div className="relative w-full sm:w-auto">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Search projects..."
                                className="pl-10 w-full sm:w-64 bg-gray-50 border-gray-200"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-4 self-end sm:self-auto">
                            <NotificationDropdown />
                            <Avatar>
                                <AvatarImage src="https://github.com/shadcn.png" />
                                <AvatarFallback>CN</AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </header>

                <div className="p-8 space-y-8">
                    {/* Summary Cards */}
                    {dashboardSummary && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-blue-600">Total Projects</p>
                                            <p className="text-3xl font-bold text-blue-900 mt-2">{dashboardSummary.totalProjects}</p>
                                        </div>
                                        <div className="bg-blue-200 rounded-full p-3">
                                            <FolderKanban className="w-6 h-6 text-blue-700" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-green-600">Average Progress</p>
                                            <p className="text-3xl font-bold text-green-900 mt-2">{dashboardSummary.averageProgress}%</p>
                                        </div>
                                        <div className="bg-green-200 rounded-full p-3">
                                            <TrendingUp className="w-6 h-6 text-green-700" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-purple-600">Average Score</p>
                                            <p className="text-3xl font-bold text-purple-900 mt-2">{dashboardSummary.averageScore}%</p>
                                        </div>
                                        <div className="bg-purple-200 rounded-full p-3">
                                            <Users className="w-6 h-6 text-purple-700" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-red-600">Total Problems</p>
                                            <p className="text-3xl font-bold text-red-900 mt-2">{dashboardSummary.totalProblems}</p>
                                        </div>
                                        <div className="bg-red-200 rounded-full p-3">
                                            <AlertTriangle className="w-6 h-6 text-red-700" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Recent Projects */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <span>Recent Projects</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.location.href = '/projects'}
                                    className="w-full sm:w-auto"
                                >
                                    View All Projects
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {(dashboardSummary?.recentProjects || projects.slice(0, 5)).map((project) => (
                                    <div
                                        key={project.id}
                                        className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors gap-4"
                                        onClick={() => onViewProject(project)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <div className="min-w-0">
                                                    <div className="font-medium text-gray-900 truncate">{project.name}</div>
                                                    <div className="text-sm text-gray-500 truncate">
                                                        {project.code} • {project.clientName} • {project.location}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-4 mt-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-600">Progress:</span>
                                                    <Progress value={project.overallProgress} className="w-20" />
                                                    <span className="text-sm font-medium">{project.overallProgress}%</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-600">Score:</span>
                                                    <span className={`font-semibold ${project.averageScore >= 90 ? 'text-green-600' :
                                                        project.averageScore >= 70 ? 'text-yellow-600' : 'text-red-600'
                                                        }`}>
                                                        {project.averageScore}%
                                                    </span>
                                                </div>
                                                {project.activeIssues > 0 && (
                                                    <Badge variant="destructive" className="bg-red-100 text-red-800">
                                                        {project.activeIssues} issues
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 self-start md:self-auto">
                                            {getStatusBadge(project.status)}
                                            <Button variant="outline" size="sm">
                                                <Eye className="w-4 h-4 mr-2" />
                                                View
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Recent Submitted QC */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                    Recent Submitted QC
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {recentSubmittedQC.length > 0 ? (
                                        recentSubmittedQC.map((inspection) => (
                                            <div key={inspection.id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 border-blue-100">
                                                <div>
                                                    <div className="font-medium text-blue-900">{inspection.phase?.name || 'Phase'}</div>
                                                    <div className="text-sm text-blue-700">
                                                        {inspection.project?.name} • Submitted by {inspection.inspector?.name || 'Inspector'}
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="bg-white hover:bg-blue-100 text-blue-700 border-blue-200"
                                                    onClick={() => router.push(`/projects/${inspection.project?.id}/inspections/${inspection.id}`)}
                                                >
                                                    Review
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-4 text-gray-500">No pending QC reviews.</div>
                                    )}
                                    {recentSubmittedQC.length > 0 && (
                                        <div className="text-center pt-2">
                                            <Button variant="link" className="text-blue-600" onClick={() => router.push('/reports')}>
                                                View All Pending Approvals
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Problems */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-red-600">
                                    <AlertCircle className="w-5 h-5" />
                                    Recent Problems
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {criticalIssues && criticalIssues.length > 0 ? (
                                        criticalIssues.slice(0, 5).map((issue) => (
                                            <div key={issue.id} className="flex items-center justify-between p-3 border border-red-200 bg-red-50 rounded-lg">
                                                <div>
                                                    <div className="font-medium text-red-900">{issue.item}</div>
                                                    <div className="text-sm text-red-700">{issue.issue} • {issue.phase}</div>
                                                </div>
                                                <Button size="sm" variant="destructive">Fix</Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-4 text-gray-500">No critical issues found.</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Projects with Issues (Existing) */}
                    {dashboardSummary?.projectsWithIssues && dashboardSummary.projectsWithIssues.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-orange-600">Projects Needing Attention</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {dashboardSummary.projectsWithIssues.map((project) => (
                                        <div
                                            key={project.id}
                                            className="flex items-center justify-between p-3 border border-orange-200 bg-orange-50 rounded-lg"
                                        >
                                            <div>
                                                <div className="font-medium text-orange-900">{project.name}</div>
                                                <div className="text-sm text-orange-700">
                                                    {project.code} • {project.activeIssues} active issues
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-orange-200 text-orange-700 hover:bg-orange-100"
                                                onClick={() => onViewProject(project)}
                                            >
                                                Review
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Project Detail View */}
                    {currentView === 'project-detail' && selectedProject && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedProject.name}</h2>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {selectedProject.code} • {selectedProject.clientName} • {selectedProject.location}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setCurrentView('dashboard')
                                            setSelectedProject(null)
                                        }}
                                    >
                                        ← Back to Dashboard
                                    </Button>
                                </div>

                                {/* Project Stats */}
                                <div className="grid grid-cols-3 gap-4 mt-4">
                                    <div className="bg-blue-50 rounded-lg p-4">
                                        <div className="text-sm text-blue-600 font-medium">Progress</div>
                                        <div className="text-2xl font-bold text-blue-900 mt-1">{selectedProject.overallProgress}%</div>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-4">
                                        <div className="text-sm text-green-600 font-medium">Quality Score</div>
                                        <div className="text-2xl font-bold text-green-900 mt-1">{selectedProject.averageScore}%</div>
                                    </div>
                                    <div className="bg-red-50 rounded-lg p-4">
                                        <div className="text-sm text-red-600 font-medium">Active Issues</div>
                                        <div className="text-2xl font-bold text-red-900 mt-1">{selectedProject.activeIssues}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Phase List */}
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Project Phases</h3>
                                <div className="space-y-3">
                                    {selectedProject.phases.map((phase) => (
                                        <div
                                            key={phase.id}
                                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => onStartChecklist(phase)}
                                        >
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">{phase.name}</div>
                                                <div className="text-sm text-gray-500 mt-1">
                                                    {getStatusBadge(phase.status)}
                                                </div>
                                            </div>
                                            {phase.score !== null && (
                                                <div className={`text-2xl font-bold mr-4 ${phase.score >= 90 ? 'text-green-600' :
                                                    phase.score >= 70 ? 'text-orange-600' : 'text-red-600'
                                                    }`}>
                                                    {phase.score}%
                                                </div>
                                            )}
                                            <Button variant="outline" size="sm">
                                                <Eye className="w-4 h-4 mr-2" />
                                                Open Checklist
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
