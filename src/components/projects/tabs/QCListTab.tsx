'use client'

import { useState } from 'react'

import { useRouter, useParams } from 'next/navigation'
import { createInspection, deleteInspection } from '@/app/projects/[id]/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Upload, Eye, Trash2, CheckCircle2, XCircle, AlertCircle, Circle, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

interface QCListTabProps {
    phases: any[]
    onAddPhase: () => void
    onImportTemplate: () => void
    onImportPhase: () => void
}

export function QCListTab({ phases, onAddPhase, onImportTemplate, onImportPhase }: QCListTabProps) {
    const router = useRouter()
    const params = useParams()
    const projectId = params.id as string
    const { toast } = useToast()
    const [activePhase, setActivePhase] = useState<string>("")

    const handlePhaseClick = async (phase: any) => {
        if (phase.inspectionId) {
            router.push(`/projects/${projectId}/inspections/${phase.inspectionId}`)
        } else {
            // Create new inspection
            try {
                // Get first QC user as inspector
                // TODO: This should come from auth context
                const response = await fetch('/api/users/qc')
                const data = await response.json()

                if (!data.user) {
                    toast({
                        title: "Error",
                        description: "No QC inspector found. Please create a user with role QC.",
                        variant: "destructive"
                    })
                    return
                }

                const inspection = await createInspection({
                    projectId,
                    phaseId: phase.id,
                    name: `${phase.name} Inspection`,
                    inspectorId: data.user.id
                })

                router.push(`/projects/${projectId}/inspections/${inspection.id}`)
            } catch (error) {
                console.error('Failed to create inspection:', error)
                toast({
                    title: "Error",
                    description: "Failed to create inspection",
                    variant: "destructive"
                })
            }
        }
    }

    const handleDelete = async (e: React.MouseEvent, inspectionId: string) => {
        e.stopPropagation()
        if (!confirm('Apakah Anda yakin ingin menghapus fase ini? Data inspeksi akan hilang permanen.')) return

        try {
            await deleteInspection(inspectionId)
            toast({
                title: "Berhasil",
                description: "Fase berhasil dihapus",
            })
            router.refresh()
        } catch (error) {
            toast({
                title: "Gagal",
                description: "Gagal menghapus fase",
                variant: "destructive"
            })
        }
    }

    const handleExportPhase = async (e: React.MouseEvent, inspectionId: string, phaseName: string) => {
        e.stopPropagation()
        try {
            const response = await fetch(`/api/reports/pdf/${inspectionId}`)
            if (!response.ok) throw new Error('Export failed')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `qc-report-${phaseName.replace(/\s+/g, '-').toLowerCase()}.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            toast({ title: "Success", description: "Laporan fase berhasil diunduh" })
        } catch (error) {
            toast({ title: "Error", description: "Gagal mengexport laporan fase", variant: "destructive" })
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h2 className="text-xl font-semibold">Fase Pekerjaan</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={onImportPhase} className="w-full sm:w-auto">
                        <Upload className="mr-2 h-4 w-4" />
                        Impor Fase Pekerjaan
                    </Button>
                    <Button onClick={onAddPhase} className="w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Fase Pekerjaan
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    {phases && phases.length > 0 ? (
                        <Accordion
                            type="single"
                            collapsible
                            className="w-full space-y-4"
                            value={activePhase}
                            onValueChange={setActivePhase}
                        >
                            {phases.map((phase: any) => (
                                <AccordionItem key={phase.id} value={phase.id} className="border rounded-lg px-4">
                                    <div className="flex items-center justify-between py-4">
                                        <div
                                            className="flex-1 cursor-pointer"
                                            onClick={() => setActivePhase(activePhase === phase.id ? "" : phase.id)}
                                        >
                                            <div className="text-left">
                                                <div className="font-medium text-lg">{phase.name}</div>
                                                <div className="text-sm text-gray-500 font-normal">{phase.description || 'No description'}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 ml-4">
                                            <Badge variant={
                                                phase.status === 'APPROVED' ? 'default' :
                                                    phase.status === 'SUBMITTED' ? 'secondary' :
                                                        'outline'
                                            }>
                                                {phase.status || 'NOT_STARTED'}
                                            </Badge>
                                            {phase.inspectionId && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => handleExportPhase(e, phase.inspectionId, phase.name)}
                                                    title="Export PDF"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant={phase.status === 'NOT_STARTED' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handlePhaseClick(phase)
                                                }}
                                            >
                                                {phase.status === 'NOT_STARTED' ? (
                                                    <>
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Mulai QC
                                                    </>
                                                ) : (
                                                    <>
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        Detail
                                                    </>
                                                )}
                                            </Button>
                                            {phase.inspectionId && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={(e) => handleDelete(e, phase.inspectionId)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <AccordionTrigger className="hover:no-underline py-0" />
                                        </div>
                                    </div>

                                    <AccordionContent>
                                        <div className="pt-2 pb-4 space-y-2">
                                            {phase.items && phase.items.length > 0 ? (
                                                <div className="grid gap-2">
                                                    {phase.items.map((item: any) => (
                                                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                                            <div className="flex items-center gap-3">
                                                                {item.status === 'OK' ? (
                                                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                                ) : item.status === 'NOT_OK' ? (
                                                                    <XCircle className="w-5 h-5 text-red-500" />
                                                                ) : (
                                                                    <Circle className="w-5 h-5 text-gray-300" />
                                                                )}
                                                                <span className={item.status === 'OK' ? 'text-gray-700' : 'text-gray-900'}>
                                                                    {item.title}
                                                                </span>
                                                                {item.isMandatory && (
                                                                    <Badge variant="outline" className="text-xs">Wajib</Badge>
                                                                )}
                                                            </div>
                                                            <Badge variant="outline">{item.status}</Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center text-gray-500 py-4">
                                                    Belum ada item pemeriksaan.
                                                </div>
                                            )}
                                            <div className="flex justify-end mt-4">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePhaseClick(phase)}
                                                >
                                                    Buka Halaman Detail
                                                </Button>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            Belum ada fase pekerjaan. Silakan tambah atau impor fase.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Active Issues Section */}
            {phases && phases.some(p => p.items && p.items.some((i: any) => i.status === 'NOT_OK')) && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-4 text-red-700">
                            <AlertCircle className="w-5 h-5" />
                            <h3 className="font-semibold text-lg">Active Issues (Perlu Perbaikan)</h3>
                        </div>
                        <div className="space-y-3">
                            {phases.flatMap(phase =>
                                phase.items
                                    .filter((item: any) => item.status === 'NOT_OK')
                                    .map((item: any) => ({ ...item, phase }))
                            ).map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-100 shadow-sm">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-gray-900">{item.title}</span>
                                            <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50">
                                                {item.phase.name}
                                            </Badge>
                                            {item.isMandatory && (
                                                <Badge variant="destructive" className="text-xs">Wajib</Badge>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            <span className="font-medium text-red-600">Status: NOT OK</span>
                                            {item.notes && (
                                                <p className="mt-1 text-gray-700 bg-red-50 p-2 rounded border border-red-100 italic">
                                                    "{item.notes}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                        onClick={() => handlePhaseClick(item.phase)}
                                    >
                                        Perbaiki Issue
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
