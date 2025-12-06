'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { QCListTab } from './tabs/QCListTab'
import { ApprovalTab } from './tabs/ApprovalTab'
import { TemplateTab } from './tabs/TemplateTab'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Brain, Download, Loader2, Sparkles, Bot, ChevronDown, Pin, PinOff, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { usePinnedProjects } from '@/contexts/PinnedProjectsContext'

import { AddPhaseDialog } from './dialogs/AddPhaseDialog'
import { AddTemplateDialog } from './dialogs/AddTemplateDialog'
import { useState, useEffect } from 'react'

interface ProjectDetailClientProps {
    project: any
    templates: any[]
    allPhases: any[]
}

interface AISettings {
    apiKey: string;
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    enabled: boolean;
    autoAnalysis: boolean;
}

interface ProjectAnalysis {
    id: string;
    content: string;
    provider: string;
    model: string;
    score: number;
    createdAt: string;
}

export default function ProjectDetailClient({ project, templates, allPhases }: ProjectDetailClientProps) {
    const [isAddPhaseOpen, setIsAddPhaseOpen] = useState(false)
    const [isImportTemplateOpen, setIsImportTemplateOpen] = useState(false)
    const [isImportPhaseOpen, setIsImportPhaseOpen] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null)
    const [latestAnalysis, setLatestAnalysis] = useState<ProjectAnalysis | null>(null)
    const [analysisHistory, setAnalysisHistory] = useState<ProjectAnalysis[]>([])
    const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
    const [isMounted, setIsMounted] = useState(false)

    const { toast } = useToast()
    const { pinProject, unpinProject, isPinned } = usePinnedProjects()
    const isProjectPinned = isPinned(project.id)

    const togglePin = () => {
        if (isProjectPinned) {
            unpinProject(project.id)
            toast({ title: "Project Unpinned", description: "Project removed from sidebar." })
        } else {
            pinProject({
                id: project.id,
                name: project.name,
                code: project.code,
                url: `/projects/${project.id}`,
            })
            toast({ title: "Project Pinned", description: "Project added to sidebar." })
        }
    }

    useEffect(() => {
        setIsMounted(true)
        const savedSettings = localStorage.getItem('aiSettings')
        if (savedSettings) {
            try {
                setAiSettings(JSON.parse(savedSettings))
            } catch (e) {
                console.error('Failed to parse AI settings')
            }
        }

        // Fetch analysis history
        fetchAnalysisHistory()
    }, [])

    const fetchAnalysisHistory = async () => {
        try {
            const response = await fetch(`/api/projects/${project.id}/analysis`)
            const data = await response.json()
            if (data.success) {
                setAnalysisHistory(data.analyses)
                if (data.analyses.length > 0) {
                    setAiAnalysisResult(data.analyses[0].content)
                    setLatestAnalysis(data.analyses[0])
                }
            }
        } catch (error) {
            console.error('Failed to fetch analysis history', error)
        }
    }

    const handleAddPhase = () => {
        setIsAddPhaseOpen(true)
    }

    const handleImportTemplate = () => {
        console.log('Import template')
    }

    const handleImportPhase = () => {
        console.log('Import phase')
    }


    const handleAIAnalysis = async () => {
        if (!aiSettings?.enabled) {
            toast({
                title: "AI Analysis Disabled",
                description: "Please enable AI Analysis in Settings first.",
                variant: "destructive"
            })
            return
        }

        if (!aiSettings?.apiKey) {
            toast({
                title: "API Key Missing",
                description: "Please configure your AI API Key in Settings.",
                variant: "destructive"
            })
            return
        }

        setIsAnalyzing(true)
        try {
            // Calculate metrics
            const allItems = project.phases?.flatMap((p: any) => p.items || []) || []
            const completedItems = allItems.filter((i: any) => i.status === 'OK' || i.status === 'NOT_OK').length
            const totalItems = allItems.length

            // Prepare data for analysis
            const qcData = {
                projectName: project.name,
                phaseName: 'Project Overview',
                score: project.averageScore,
                completedItems: completedItems,
                totalItems: totalItems,
                criticalItems: project.activeIssues,
                items: allItems.map((item: any) => ({
                    name: item.title,
                    score: item.status === 'OK' ? 100 : 0,
                    status: item.status,
                    notes: item.notes,
                    photos: item.photos
                })),
                inspectorNotes: `Client: ${project.clientName}, Location: ${project.location}`,
                projectId: project.id
            }

            const response = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    qcData,
                    apiKey: aiSettings.apiKey,
                    provider: aiSettings.provider,
                    model: aiSettings.model,
                    temperature: aiSettings.temperature,
                    maxTokens: aiSettings.maxTokens
                })
            })

            const data = await response.json()
            if (data.success) {
                setAiAnalysisResult(data.analysis)
                // Refresh history
                fetchAnalysisHistory()
                toast({ title: "Analisis Selesai", description: "Hasil analisis AI telah diperbarui." })
            } else {
                toast({ title: "Gagal", description: data.error || "Gagal melakukan analisa AI.", variant: "destructive" })
            }
        } catch (error) {
            toast({ title: "Error", description: "Terjadi kesalahan saat menghubungi layanan AI.", variant: "destructive" })
        } finally {
            setIsAnalyzing(false)
        }
    }

    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
    const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>("")

    const handleExportStandard = async () => {
        await handleExportFullReport(false);
    }

    const handleExportWithAI = () => {
        setIsExportDialogOpen(true);
    }

    const handleConfirmExportAI = async () => {
        if (!selectedAnalysisId) return;

        const selectedAnalysis = analysisHistory.find(a => a.id === selectedAnalysisId);
        if (selectedAnalysis) {
            await handleExportFullReport(true, selectedAnalysis.content);
            setIsExportDialogOpen(false);
        }
    }

    const handleExportFullReport = async (includeAI: boolean, aiContent?: string) => {
        setIsExporting(true)

        // Open window immediately to avoid popup blockers
        const newWindow = window.open('', '_blank')
        if (newWindow) {
            newWindow.document.write('<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><div><p>Generating PDF Report...</p><p>Please wait, this may take a few moments.</p></div></body></html>')
        } else {
            toast({ title: "Popup Blocked", description: "Please allow popups for this site to view the report.", variant: "destructive" })
            setIsExporting(false)
            return
        }

        try {
            // Use POST to send AI settings if enabled
            const formData = new FormData();
            formData.append('includeAI', includeAI ? 'true' : 'false');

            // Add digital signature if available
            const digitalSignature = localStorage.getItem('digitalSignature');
            if (digitalSignature) {
                formData.append('signatureLogo', digitalSignature);
            }

            if (includeAI) {
                if (aiContent) {
                    formData.append('aiAnalysisContent', aiContent);
                } else if (aiSettings) {
                    // Fallback if no specific content selected
                    formData.append('aiSettings', JSON.stringify(aiSettings));
                }
            }

            const response = await fetch(`/api/reports/pdf/project/${project.id}`, {
                method: 'POST',
                body: formData
            })

            if (!response.ok) throw new Error('Export failed')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)

            // Navigate the pre-opened window to the blob URL
            if (newWindow) {
                newWindow.location.href = url
            }

            // Clean up URL after a delay
            setTimeout(() => window.URL.revokeObjectURL(url), 1000)

            toast({ title: "Success", description: "Laporan dibuka di tab baru" })
        } catch (error) {
            if (newWindow) newWindow.close()
            toast({ title: "Error", description: "Gagal mengexport laporan", variant: "destructive" })
        } finally {
            setIsExporting(false)
        }
    }

    const [isSyncingStatus, setIsSyncingStatus] = useState(false)
    const [isSyncingResults, setIsSyncingResults] = useState(false)
    const [isSyncingAttachments, setIsSyncingAttachments] = useState(false)
    const [isSyncingTasks, setIsSyncingTasks] = useState(false)

    const handleSyncStatus = async () => {
        if (!project.perfexId) return
        setIsSyncingStatus(true)
        try {
            const response = await fetch(`/api/projects/${project.id}/sync-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: project.status })
            })
            const data = await response.json()
            if (data.success) {
                toast({ title: "Status Synced", description: `Project status updated in Perfex` })
            } else {
                throw new Error(data.error || 'Failed to sync status')
            }
        } catch (error) {
            toast({ title: "Sync Failed", description: error instanceof Error ? error.message : "Failed to sync status", variant: "destructive" })
        } finally {
            setIsSyncingStatus(false)
        }
    }

    const handleSyncResults = async () => {
        if (!project.perfexId) return
        setIsSyncingResults(true)
        try {
            const response = await fetch(`/api/projects/${project.id}/sync-results`, { method: 'POST' })
            const data = await response.json()
            if (data.success) {
                toast({ title: "Results Synced", description: data.message })
            } else {
                throw new Error(data.error || 'Failed to sync results')
            }
        } catch (error) {
            toast({ title: "Sync Failed", description: error instanceof Error ? error.message : "Failed to sync results", variant: "destructive" })
        } finally {
            setIsSyncingResults(false)
        }
    }

    const handleSyncAttachments = async () => {
        if (!project.perfexId) return
        setIsSyncingAttachments(true)
        try {
            const response = await fetch(`/api/projects/${project.id}/sync-attachments`, { method: 'POST' })
            const data = await response.json()
            if (data.success) {
                toast({ title: "Attachments Synced", description: data.message })
            } else {
                throw new Error(data.error || 'Failed to sync attachments')
            }
        } catch (error) {
            toast({ title: "Sync Failed", description: error instanceof Error ? error.message : "Failed to sync attachments", variant: "destructive" })
        } finally {
            setIsSyncingAttachments(false)
        }
    }

    const handleSyncTasks = async () => {
        if (!project.perfexId) return
        setIsSyncingTasks(true)
        try {
            const response = await fetch(`/api/projects/${project.id}/sync-tasks`, { method: 'POST' })
            const data = await response.json()
            if (data.success) {
                toast({ title: "Tasks Created", description: data.message })
            } else {
                throw new Error(data.error || 'Failed to sync tasks')
            }
        } catch (error) {
            toast({ title: "Sync Failed", description: error instanceof Error ? error.message : "Failed to sync tasks", variant: "destructive" })
        } finally {
            setIsSyncingTasks(false)
        }
    }

    const handleSyncAll = async () => {
        await handleSyncStatus();
        await handleSyncResults();
        await handleSyncTasks();
        // Attachments might take long, maybe skip or do last
        await handleSyncAttachments();
        toast({ title: "Sync Complete", description: "All data synced to Perfex" });
    }

    if (!isMounted) {
        return (
            <div className="h-full bg-gray-50 font-sans flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="h-full bg-gray-50 font-sans">
            <div className="flex-1 overflow-auto p-8">
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{project.name}</h1>
                            <p className="text-sm md:text-base text-muted-foreground mt-1">
                                {project.code} • {project.clientName} • {project.location}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                            {project.perfexId && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="gap-2 flex-1 md:flex-none">
                                            <RefreshCw className={`h-4 w-4 ${isSyncingStatus || isSyncingResults || isSyncingAttachments || isSyncingTasks ? 'animate-spin' : ''}`} />
                                            Sync
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={handleSyncStatus} disabled={isSyncingStatus}>
                                            Sync Status
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleSyncResults} disabled={isSyncingResults}>
                                            Sync Results (Note)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleSyncAttachments} disabled={isSyncingAttachments}>
                                            Sync Attachments
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleSyncTasks} disabled={isSyncingTasks}>
                                            Sync Failed Items (Tasks)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleSyncAll} className="font-bold">
                                            Sync All
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            <Button
                                variant="outline"
                                onClick={togglePin}
                                className="gap-2 flex-1 md:flex-none"
                            >
                                {isProjectPinned ? (
                                    <>
                                        <PinOff className="h-4 w-4" />
                                        Unpin
                                    </>
                                ) : (
                                    <>
                                        <Pin className="h-4 w-4" />
                                        Pin
                                    </>
                                )}
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button disabled={isExporting} className="flex-1 md:flex-none">
                                        <Download className="mr-2 h-4 w-4" />
                                        {isExporting ? 'Exporting...' : 'Export'}
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={handleExportStandard}>
                                        Export Standard (No AI)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportWithAI}>
                                        Export with AI Analysis
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="outline" onClick={() => window.location.href = '/'} className="flex-1 md:flex-none">
                                ← Back
                            </Button>
                        </div>
                    </div>

                    {/* Project Summary Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Ringkasan Proyek</span>
                                {project.perfexId && (
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                        Synced with Perfex
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Deskripsi</p>
                                    <p className="mt-1">{project.description || '-'}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Timeline</p>
                                        <p className="mt-1">
                                            {project.startDate ? new Date(project.startDate).toLocaleDateString('id-ID') : 'TBD'} - {project.endDate ? new Date(project.endDate).toLocaleDateString('id-ID') : 'TBD'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Budget</p>
                                        <p className="mt-1">
                                            {project.totalValue ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(project.totalValue) : '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="phases" className="space-y-4">
                        <TabsList className="w-full justify-start">
                            <TabsTrigger value="phases">Fase Pekerjaan</TabsTrigger>
                            <TabsTrigger value="approvals">Approvals</TabsTrigger>
                            <TabsTrigger value="ai-analysis" className="ml-auto data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900">
                                <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                                AI Analysis
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="phases" className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Progress</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{Math.round(project.overallProgress)}%</div>
                                        <Progress value={project.overallProgress} className="mt-2" />
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{project.averageScore ? project.averageScore.toFixed(1) : '0.0'}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Active Issues</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-red-500">{project.activeIssues}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total QC List</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {(() => {
                                                const allItems = project.phases?.flatMap((p: any) => p.items || []) || [];
                                                const completedItems = allItems.filter((i: any) => i.status === 'OK' || i.status === 'NOT_OK').length;
                                                return `${completedItems}/${allItems.length}`;
                                            })()}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Checked items
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            <QCListTab
                                phases={project.phases}
                                onAddPhase={() => setIsAddPhaseOpen(true)}
                                onImportTemplate={() => setIsImportTemplateOpen(true)}
                                onImportPhase={() => setIsImportPhaseOpen(true)}
                            />
                        </TabsContent>

                        <TabsContent value="ai-analysis" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Main Analysis Area */}
                                <div className="md:col-span-2 space-y-4">
                                    <Card className="h-full">
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <CardTitle>Project Analysis</CardTitle>
                                            <Button
                                                onClick={handleAIAnalysis}
                                                disabled={isAnalyzing}
                                            >
                                                {isAnalyzing ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Analyzing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Bot className="mr-2 h-4 w-4" />
                                                        Generate New Analysis
                                                    </>
                                                )}
                                            </Button>
                                        </CardHeader>
                                        <CardContent>
                                            {latestAnalysis ? (
                                                <div className="prose prose-sm max-w-none">
                                                    <div className="bg-slate-50 p-4 rounded-lg border mb-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <Badge variant="outline">{latestAnalysis.provider} - {latestAnalysis.model}</Badge>
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(latestAnalysis.createdAt).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                                            {latestAnalysis.content}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 text-muted-foreground">
                                                    <Bot className="mx-auto h-12 w-12 mb-4 opacity-20" />
                                                    <p>Belum ada analisis AI untuk project ini.</p>
                                                    <p className="text-sm">Klik tombol "Generate New Analysis" untuk memulai.</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Analysis History Sidebar */}
                                <div className="md:col-span-1">
                                    <Card className="h-full">
                                        <CardHeader>
                                            <CardTitle className="text-lg">History</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {analysisHistory.length > 0 ? (
                                                    analysisHistory.map((analysis) => (
                                                        <div
                                                            key={analysis.id}
                                                            className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-slate-50 ${latestAnalysis?.id === analysis.id ? 'border-primary bg-slate-50' : ''
                                                                }`}
                                                            onClick={() => setLatestAnalysis(analysis)}
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="font-medium text-xs uppercase">{analysis.provider}</span>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {new Date(analysis.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                                {analysis.content}
                                                            </p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground text-center py-4">
                                                        Belum ada riwayat analisis.
                                                    </p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="approvals">
                            <ApprovalTab inspections={project.inspections || []} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
            <AddPhaseDialog
                open={isAddPhaseOpen}
                onOpenChange={setIsAddPhaseOpen}
                projectId={project.id}
                allPhases={allPhases}
                templates={templates}
            />

            <AddTemplateDialog
                open={isImportTemplateOpen}
                onOpenChange={setIsImportTemplateOpen}
                allPhases={allPhases}
            />


            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select AI Analysis Version</DialogTitle>
                        <DialogDescription>
                            Pilih versi analisis AI yang ingin disertakan dalam laporan PDF.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {analysisHistory.length > 0 ? (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {analysisHistory.map((analysis) => (
                                    <div
                                        key={analysis.id}
                                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 ${selectedAnalysisId === analysis.id ? 'border-primary bg-slate-50 ring-1 ring-primary' : ''
                                            }`}
                                        onClick={() => setSelectedAnalysisId(analysis.id)}
                                    >
                                        <div className={`w-4 h-4 mt-1 rounded-full border flex items-center justify-center ${selectedAnalysisId === analysis.id ? 'border-primary' : 'border-slate-300'
                                            }`}>
                                            {selectedAnalysisId === analysis.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-sm">{analysis.provider} - {analysis.model}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(analysis.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                                {analysis.content}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>Belum ada riwayat analisis AI.</p>
                                <p className="text-sm">Silakan generate analisis baru terlebih dahulu.</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmExportAI} disabled={!selectedAnalysisId}>
                            Export PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
