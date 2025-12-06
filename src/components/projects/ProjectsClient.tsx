'use client'

import { useState, useEffect } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
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
    Trash2
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
        inspectionId?: string | null
    }>
}

interface ProjectsClientProps {
    initialProjects: Project[]
}

export default function ProjectsClient({ initialProjects }: ProjectsClientProps) {
    // ALL HOOKS MUST BE AT THE TOP - before any early returns!
    const [projects, setProjects] = useState<Project[]>(initialProjects)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
    const [selectedProjectType, setSelectedProjectType] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)

    // Handle hydration mismatch
    useEffect(() => {
        console.log('ProjectsClient: Mounted with projects', initialProjects.length)
        setMounted(true)
    }, [initialProjects])

    // Helper functions (not hooks, can be after early return)
    const getStatusBadge = (status: string) => {
        switch (status) {
            // Project statuses
            case 'ACTIVE':
                return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" /> Aktif</Badge>
            case 'COMPLETED':
                return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Selesai</Badge>
            case 'ON_HOLD':
                return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" /> Ditunda</Badge>
            case 'CANCELLED':
                return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Dibatalkan</Badge>
            // Inspection statuses (legacy)
            case 'APPROVED':
                return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Disetujui</Badge>
            case 'NEEDS_REWORK':
                return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" /> Perlu Perbaikan</Badge>
            case 'IN_PROGRESS':
                return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" /> Sedang Dicek</Badge>
            case 'NOT_STARTED':
                return <Badge className="bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1" /> Belum Mulai</Badge>
            case 'REJECTED':
                return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Ditolak</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const getScoreColor = (score: number | null) => {
        if (!score) return 'text-gray-500'
        if (score >= 90) return 'text-green-600'
        if (score >= 70) return 'text-yellow-600'
        return 'text-red-600'
    }

    const refreshData = async () => {
        try {
            const response = await fetch('/api/projects')
            if (response.ok) {
                const data = await response.json()
                setProjects(data)
            }
        } catch (error) {
            console.error('Error refreshing data:', error)
        }
    }

    const handleSync = async () => {
        setIsSyncing(true)
        try {
            const response = await fetch('/api/perfex/import-projects', { method: 'POST' })
            const data = await response.json()

            if (data.success) {
                alert(`Sync berhasil! ${data.message}`)
                refreshData() // Refresh the project list after sync
            } else {
                alert('Sync gagal: ' + (data.error || data.details))
            }
        } catch (error) {
            alert('Sync gagal')
        } finally {
            setIsSyncing(false)
        }
    }

    // Selection handlers
    const toggleSelectProject = (projectId: string) => {
        const newSelected = new Set(selectedProjects)
        if (newSelected.has(projectId)) {
            newSelected.delete(projectId)
        } else {
            newSelected.add(projectId)
        }
        setSelectedProjects(newSelected)
    }

    const toggleSelectAll = () => {
        if (selectedProjects.size === filteredProjects.length) {
            setSelectedProjects(new Set())
        } else {
            setSelectedProjects(new Set(filteredProjects.map(p => p.id)))
        }
    }

    const handleBulkDelete = async () => {
        if (selectedProjects.size === 0) return

        const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus ${selectedProjects.size} project?`)
        if (!confirmDelete) return

        setIsDeleting(true)
        try {
            const response = await fetch('/api/projects/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedProjects) })
            })
            const data = await response.json()

            if (data.success) {
                alert(`Berhasil menghapus ${data.deleted} project`)
                setSelectedProjects(new Set())
                refreshData()
            } else {
                alert('Gagal menghapus: ' + (data.error || 'Unknown error'))
            }
        } catch (error) {
            alert('Gagal menghapus project')
        } finally {
            setIsDeleting(false)
        }
    }

    // Show loading if not mounted (hydration safety)
    if (!mounted) {
        return (
            <div className="h-full bg-gray-50 font-sans">
                <div className="flex-1 overflow-auto p-8">
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                </div>
            </div>
        )
    }

    const filteredProjects = projects.filter(project => {
        const nameMatch = (project.name || '').toLowerCase().includes(searchQuery.toLowerCase())
        const codeMatch = (project.code || '').toLowerCase().includes(searchQuery.toLowerCase())
        const clientMatch = (project.clientName || '').toLowerCase().includes(searchQuery.toLowerCase())

        const matchesSearch = nameMatch || codeMatch || clientMatch
        const matchesStatus = selectedStatus ? project.status === selectedStatus : true
        const matchesType = selectedProjectType ? project.projectType === selectedProjectType : true
        return matchesSearch && matchesStatus && matchesType
    })

    return (
        <div className="h-full bg-gray-50 font-sans">
            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 px-4 py-4 md:px-8 flex flex-col md:flex-row gap-4 md:items-center justify-between sticky top-0 z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Semua Projects</h1>
                        <p className="text-sm text-gray-500 mt-1">Kelola dan monitor semua proyek QC</p>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Cari project..."
                                className="pl-10 w-full md:w-64 bg-gray-50 border-gray-200"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon" className="rounded-full shrink-0">
                            <Bell className="w-5 h-5 text-gray-600" />
                        </Button>
                        <Avatar className="shrink-0">
                            <AvatarImage src="https://github.com/shadcn.png" />
                            <AvatarFallback>CN</AvatarFallback>
                        </Avatar>
                    </div>
                </header>

                <div className="p-4 md:p-8 space-y-6">
                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4 md:items-center">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Filter:</span>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                            <Select value={selectedStatus || 'ALL'} onValueChange={(value) => setSelectedStatus(value === 'ALL' ? null : value)}>
                                <SelectTrigger className="w-full md:w-48">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Semua Status</SelectItem>
                                    <SelectItem value="NOT_STARTED">Belum Mulai</SelectItem>
                                    <SelectItem value="IN_PROGRESS">Sedang Berjalan</SelectItem>
                                    <SelectItem value="APPROVED">Disetujui</SelectItem>
                                    <SelectItem value="NEEDS_REWORK">Perlu Perbaikan</SelectItem>
                                    <SelectItem value="REJECTED">Ditolak</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={selectedProjectType || 'ALL'} onValueChange={(value) => setSelectedProjectType(value === 'ALL' ? null : value)}>
                                <SelectTrigger className="w-full md:w-48">
                                    <SelectValue placeholder="Tipe Project" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Semua Tipe</SelectItem>
                                    <SelectItem value="Kitchen Set">Kitchen Set</SelectItem>
                                    <SelectItem value="Wardrobe">Wardrobe</SelectItem>
                                    <SelectItem value="TV Cabinet">TV Cabinet</SelectItem>
                                    <SelectItem value="Vanity">Vanity</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" className="w-full md:w-auto" onClick={() => {
                                setSelectedStatus(null)
                                setSelectedProjectType(null)
                                setSearchQuery('')
                            }}>
                                Reset Filter
                            </Button>
                        </div>
                    </div>

                    {/* Bulk Action Bar */}
                    {selectedProjects.size > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                            <span className="text-blue-800 font-medium">
                                {selectedProjects.size} project dipilih
                            </span>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {isDeleting ? 'Menghapus...' : 'Hapus Project'}
                            </Button>
                        </div>
                    )}

                    {/* Projects Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <span>Daftar Projects ({filteredProjects.length})</span>
                                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                    <Button onClick={() => window.location.href = '/projects/new'} size="sm" className="w-full sm:w-auto">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Buat Project Baru
                                    </Button>
                                    <Button onClick={handleSync} variant="outline" size="sm" className="w-full sm:w-auto" disabled={isSyncing}>
                                        {isSyncing ? 'Syncing...' : 'Sync Project'}
                                    </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={filteredProjects.length > 0 && selectedProjects.size === filteredProjects.length}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead>Project</TableHead>
                                        <TableHead>Klien</TableHead>
                                        <TableHead>Progress</TableHead>
                                        <TableHead>Skor Kualitas</TableHead>
                                        <TableHead>Issues</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProjects.map((project) => (
                                        <TableRow key={project.id} className={`hover:bg-gray-50 ${selectedProjects.has(project.id) ? 'bg-blue-50' : ''}`}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedProjects.has(project.id)}
                                                    onCheckedChange={() => toggleSelectProject(project.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div
                                                    className="cursor-pointer group"
                                                    onClick={() => window.location.href = `/projects/${project.id}`}
                                                >
                                                    <div className="font-medium text-gray-900 group-hover:text-blue-600 group-hover:underline transition-colors">
                                                        {project.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">{project.code}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{project.clientName}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Progress value={project.overallProgress} className="w-16" />
                                                    <span className="text-sm font-medium">{project.overallProgress}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`font-semibold ${getScoreColor(project.averageScore)}`}>
                                                    {project.averageScore}%
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {project.activeIssues > 0 ? (
                                                    <Badge variant="destructive" className="bg-red-100 text-red-800">
                                                        {project.activeIssues} issues
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-green-100 text-green-800">
                                                        0 issues
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(project.status)}</TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            onClick={() => window.location.href = `/projects/${project.id}`}
                                                        >
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            Lihat Detail
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <Download className="w-4 h-4 mr-2" />
                                                            Export Report
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem>
                                                            <FileText className="w-4 h-4 mr-2" />
                                                            View History
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {filteredProjects.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    Tidak ada project yang ditemukan dengan filter yang dipilih
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}