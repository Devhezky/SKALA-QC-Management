'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createPhaseWithItems, getTemplateDetails } from '@/app/projects/[id]/actions'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from '@/components/ui/card'

interface AddPhaseDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    allPhases: any[]
    projectId: string
    templates: any[]
}

interface QCItem {
    title: string
    criteria: string
    checkMethod: string
    isMandatory: boolean
}

const CHECK_METHODS = [
    "Visual",
    "Sentuh/Raba",
    "Tes Tegangan",
    "Pengukuran",
    "Tes Fungsi",
    "Dokumentasi",
    "Lainnya"
]

export function AddPhaseDialog({ open, onOpenChange, allPhases, projectId, templates }: AddPhaseDialogProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("manual")

    // Manual Mode State
    const [mode, setMode] = useState<'select' | 'create'>('select')
    const [selectedPhaseId, setSelectedPhaseId] = useState('')
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [items, setItems] = useState<QCItem[]>([])

    // Import Mode State
    const [selectedTemplateId, setSelectedTemplateId] = useState('')
    const [previewTemplate, setPreviewTemplate] = useState<any>(null)

    const handleAddItem = () => {
        setItems([...items, { title: '', criteria: '', checkMethod: 'Visual', isMandatory: true }])
    }

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const handleItemChange = (index: number, field: keyof QCItem, value: any) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], [field]: value }
        setItems(newItems)
    }

    const handleTemplateSelect = async (templateId: string) => {
        setSelectedTemplateId(templateId)
        if (templateId) {
            const details = await getTemplateDetails(templateId)
            setPreviewTemplate(details)
        } else {
            setPreviewTemplate(null)
        }
    }

    const handleImportSubmit = async () => {
        if (!previewTemplate) return

        // Validate template has phases and items
        if (!previewTemplate.phases || previewTemplate.phases.length === 0) {
            toast({
                title: "Validasi Gagal",
                description: "Template tidak memiliki fase yang dapat diimpor",
                variant: "destructive"
            })
            return
        }

        // Validate each phase has items
        for (const phase of previewTemplate.phases) {
            if (!phase.items || phase.items.length === 0) {
                toast({
                    title: "Validasi Gagal",
                    description: `Fase "${phase.name}" tidak memiliki item QC`,
                    variant: "destructive"
                })
                return
            }

            // Validate each item has required fields
            for (const item of phase.items) {
                if (!item.title || !item.criteria || !item.checkMethod) {
                    toast({
                        title: "Validasi Gagal",
                        description: `Item di fase "${phase.name}" tidak lengkap. Semua item harus memiliki title, criteria, dan checkMethod.`,
                        variant: "destructive"
                    })
                    console.error('Incomplete item:', item)
                    return
                }
            }
        }

        setIsLoading(true)
        try {
            // Import each phase from the template
            for (const phase of previewTemplate.phases) {
                console.log('Importing phase:', phase.name, 'with', phase.items.length, 'items')
                await createPhaseWithItems({
                    projectId,
                    newPhase: { name: phase.name, description: `Imported from ${previewTemplate.name}` },
                    items: phase.items
                })
            }

            toast({
                title: "Berhasil",
                description: `${previewTemplate.phases.length} fase berhasil diimpor ke proyek`,
            })
            router.refresh()
            onOpenChange(false)
        } catch (error) {
            console.error('Import error:', error)
            const errorMessage = error instanceof Error ? error.message : "Gagal mengimpor template"
            toast({
                title: "Gagal",
                description: errorMessage,
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (mode === 'create' && !name) {
            toast({
                title: "Validasi Gagal",
                description: "Nama fase wajib diisi",
                variant: "destructive"
            })
            return
        }
        if (mode === 'select' && !selectedPhaseId) {
            toast({
                title: "Validasi Gagal",
                description: "Pilih fase terlebih dahulu",
                variant: "destructive"
            })
            return
        }

        setIsLoading(true)

        try {
            await createPhaseWithItems({
                projectId,
                phaseId: mode === 'select' ? selectedPhaseId : undefined,
                newPhase: mode === 'create' ? { name, description } : undefined,
                items
            })

            toast({
                title: "Berhasil",
                description: "Fase pekerjaan berhasil ditambahkan",
            })
            router.refresh()
            onOpenChange(false)

            // Reset
            setName('')
            setDescription('')
            setItems([])
            setMode('select')
            setSelectedPhaseId('')
        } catch (error) {
            console.error(error)
            toast({
                title: "Gagal",
                description: "Gagal menambahkan fase",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tambah Fase Pekerjaan</DialogTitle>
                    <DialogDescription>
                        Tambahkan fase pekerjaan baru secara manual atau impor dari template.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manual">Manual</TabsTrigger>
                        <TabsTrigger value="import">Impor Template</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual">
                        <form onSubmit={handleManualSubmit} className="space-y-4 py-4">
                            {/* Existing Manual Form Logic */}
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <Button
                                        type="button"
                                        variant={mode === 'select' ? 'default' : 'outline'}
                                        onClick={() => setMode('select')}
                                        className="flex-1"
                                    >
                                        Pilih Fase Ada
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={mode === 'create' ? 'default' : 'outline'}
                                        onClick={() => setMode('create')}
                                        className="flex-1"
                                    >
                                        Buat Fase Baru
                                    </Button>
                                </div>

                                {mode === 'select' ? (
                                    <div className="space-y-2">
                                        <Label>Pilih Fase</Label>
                                        <Select value={selectedPhaseId} onValueChange={setSelectedPhaseId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih fase..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {allPhases.map((phase) => (
                                                    <SelectItem key={phase.id} value={phase.id}>
                                                        {phase.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Nama Fase</Label>
                                            <Input
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Contoh: Persiapan Lahan"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Deskripsi</Label>
                                            <Textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Deskripsi singkat..."
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label>Item QC</Label>
                                        <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Tambah Item
                                        </Button>
                                    </div>

                                    {items.length === 0 && (
                                        <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                                            Belum ada item QC
                                        </div>
                                    )}

                                    {items.map((item, index) => (
                                        <Card key={index}>
                                            <CardContent className="p-4 space-y-4 relative">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                                                    onClick={() => handleRemoveItem(index)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>

                                                <div className="grid gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Judul Item</Label>
                                                        <Input
                                                            value={item.title}
                                                            onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                                                            placeholder="Contoh: Cek Kebersihan"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label>Metode Pengecekan</Label>
                                                            <Select
                                                                value={CHECK_METHODS.includes(item.checkMethod) ? item.checkMethod : 'Lainnya'}
                                                                onValueChange={(value) => handleItemChange(index, 'checkMethod', value)}
                                                            >
                                                                <SelectTrigger className="bg-white">
                                                                    <SelectValue placeholder="Pilih metode..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {CHECK_METHODS.map((method) => (
                                                                        <SelectItem key={method} value={method}>
                                                                            {method}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            {(item.checkMethod === 'Lainnya' || !CHECK_METHODS.includes(item.checkMethod)) && (
                                                                <Input
                                                                    value={item.checkMethod === 'Lainnya' ? '' : item.checkMethod}
                                                                    onChange={(e) => handleItemChange(index, 'checkMethod', e.target.value)}
                                                                    placeholder="Tulis metode pengecekan..."
                                                                    className="mt-2"
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Kriteria Penerimaan</Label>
                                                            <Textarea
                                                                value={item.criteria}
                                                                onChange={(e) => handleItemChange(index, 'criteria', e.target.value)}
                                                                placeholder="Kriteria..."
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            checked={item.isMandatory}
                                                            onCheckedChange={(checked) => handleItemChange(index, 'isMandatory', checked)}
                                                        />
                                                        <Label>Wajib</Label>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Simpan
                                </Button>
                            </DialogFooter>
                        </form>
                    </TabsContent>

                    <TabsContent value="import">
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Pilih Template</Label>
                                <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih template..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.name} ({t.projectType})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {previewTemplate && (
                                <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                                    <h3 className="font-semibold">Preview: {previewTemplate.name}</h3>
                                    <div className="space-y-2">
                                        {previewTemplate.phases.map((phase: any, idx: number) => (
                                            <div key={idx} className="bg-white p-3 rounded border">
                                                <div className="font-medium">{phase.name}</div>
                                                <div className="text-sm text-gray-500">{phase.items.length} items</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <DialogFooter>
                                <Button onClick={handleImportSubmit} disabled={isLoading || !previewTemplate}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Impor Semua Fase
                                </Button>
                            </DialogFooter>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
