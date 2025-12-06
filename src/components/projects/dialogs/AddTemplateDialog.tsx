import { useState, useEffect } from 'react'
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
import { createFullTemplate } from '@/app/projects/[id]/actions'
import { Loader2, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface AddTemplateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    allPhases: any[]
    initialData?: any // For editing
}

interface QCItem {
    title: string
    criteria: string
    checkMethod: string
    isMandatory: boolean
}

interface PhaseDraft {
    id: string // Temp ID
    name: string
    items: QCItem[]
    isOpen: boolean
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

const PROJECT_TYPES = [
    "Residential",
    "Commercial",
    "Industrial",
    "Infrastructure",
    "Interior",
    "Other"
]

export function AddTemplateDialog({ open, onOpenChange, allPhases, initialData }: AddTemplateDialogProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)

    // Form State
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [projectType, setProjectType] = useState('')
    const [phases, setPhases] = useState<PhaseDraft[]>([])

    // Populate form when initialData changes
    useEffect(() => {
        if (initialData) {
            setName(initialData.name)
            setDescription(initialData.description)
            setProjectType(initialData.projectType)
            setPhases(initialData.phases.map((p: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                name: p.name,
                items: p.items,
                isOpen: false
            })))
        } else {
            // Reset if no initialData (create mode)
            setName('')
            setDescription('')
            setProjectType('')
            setPhases([])
        }
    }, [initialData, open])

    const handleAddPhase = () => {
        setPhases([
            ...phases,
            {
                id: Math.random().toString(36).substr(2, 9),
                name: '',
                items: [],
                isOpen: true
            }
        ])
    }

    const handleRemovePhase = (phaseId: string) => {
        setPhases(phases.filter(p => p.id !== phaseId))
    }

    const handlePhaseNameChange = (phaseId: string, newName: string) => {
        setPhases(phases.map(p => p.id === phaseId ? { ...p, name: newName } : p))
    }

    const togglePhase = (phaseId: string) => {
        setPhases(phases.map(p => p.id === phaseId ? { ...p, isOpen: !p.isOpen } : p))
    }

    const handleAddItem = (phaseId: string) => {
        setPhases(phases.map(p => {
            if (p.id === phaseId) {
                return {
                    ...p,
                    items: [...p.items, { title: '', criteria: '', checkMethod: 'Visual', isMandatory: true }]
                }
            }
            return p
        }))
    }

    const handleRemoveItem = (phaseId: string, itemIndex: number) => {
        setPhases(phases.map(p => {
            if (p.id === phaseId) {
                return {
                    ...p,
                    items: p.items.filter((_, i) => i !== itemIndex)
                }
            }
            return p
        }))
    }

    const handleItemChange = (phaseId: string, itemIndex: number, field: keyof QCItem, value: any) => {
        setPhases(phases.map(p => {
            if (p.id === phaseId) {
                const newItems = [...p.items]
                newItems[itemIndex] = { ...newItems[itemIndex], [field]: value }
                return { ...p, items: newItems }
            }
            return p
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !projectType) {
            toast({
                title: "Validasi Gagal",
                description: "Nama Template dan Tipe Proyek wajib diisi",
                variant: "destructive"
            })
            return
        }

        if (phases.length === 0) {
            toast({
                title: "Validasi Gagal",
                description: "Minimal harus ada satu fase",
                variant: "destructive"
            })
            return
        }

        setIsLoading(true)

        try {
            await createFullTemplate({
                name,
                description,
                projectType,
                phases: phases.map(p => ({
                    name: p.name,
                    items: p.items
                }))
            })

            toast({
                title: "Berhasil",
                description: "Template QC berhasil dibuat",
            })
            router.refresh()
            onOpenChange(false)

            // Reset
            setName('')
            setDescription('')
            setProjectType('')
            setPhases([])
        } catch (error) {
            console.error(error)
            toast({
                title: "Gagal",
                description: "Gagal membuat template",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Buat Template QC Baru</DialogTitle>
                        <DialogDescription>
                            Buat template standar dengan fase dan item QC yang terstruktur.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nama Template</Label>
                                <Input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Contoh: Standar Renovasi Rumah"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipe Proyek</Label>
                                <Select value={projectType} onValueChange={setProjectType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih tipe..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PROJECT_TYPES.map(type => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Deskripsi</Label>
                                <Textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Deskripsi template..."
                                />
                            </div>
                        </div>

                        {/* Phases Builder */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="text-lg font-semibold">Struktur Fase & Item</h3>
                                <Button type="button" onClick={handleAddPhase} size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Tambah Fase
                                </Button>
                            </div>

                            {phases.length === 0 && (
                                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                                    Belum ada fase. Klik "Tambah Fase" untuk memulai.
                                </div>
                            )}

                            <div className="space-y-4">
                                {phases.map((phase, index) => (
                                    <Collapsible
                                        key={phase.id}
                                        open={phase.isOpen}
                                        onOpenChange={() => togglePhase(phase.id)}
                                        className="border rounded-lg bg-gray-50/50"
                                    >
                                        <div className="flex items-center p-4 gap-4">
                                            <CollapsibleTrigger asChild>
                                                <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent">
                                                    {phase.isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                </Button>
                                            </CollapsibleTrigger>

                                            <div className="flex-1 grid gap-2">
                                                <Label className="text-xs text-gray-500">Nama Fase {index + 1}</Label>
                                                <div className="flex gap-2">
                                                    {/* Phase Name Input with Datalist for suggestions */}
                                                    <Input
                                                        value={phase.name}
                                                        onChange={e => handlePhaseNameChange(phase.id, e.target.value)}
                                                        placeholder="Nama Fase (misal: Persiapan)"
                                                        list={`phases-list-${phase.id}`}
                                                        className="bg-white"
                                                    />
                                                    <datalist id={`phases-list-${phase.id}`}>
                                                        {allPhases.map(p => (
                                                            <option key={p.id} value={p.name} />
                                                        ))}
                                                    </datalist>
                                                </div>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-gray-400 hover:text-red-500"
                                                onClick={() => handleRemovePhase(phase.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <CollapsibleContent>
                                            <div className="p-4 pt-0 space-y-4">
                                                <div className="pl-8 space-y-4">
                                                    {phase.items.map((item, itemIndex) => (
                                                        <div key={itemIndex} className="grid gap-4 p-4 border rounded bg-white relative">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-red-500"
                                                                onClick={() => handleRemoveItem(phase.id, itemIndex)}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label>Judul Item</Label>
                                                                    <Input
                                                                        value={item.title}
                                                                        onChange={e => handleItemChange(phase.id, itemIndex, 'title', e.target.value)}
                                                                        placeholder="Item QC..."
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Metode</Label>
                                                                    <div className="flex flex-col gap-2">
                                                                        <Select
                                                                            value={CHECK_METHODS.includes(item.checkMethod) ? item.checkMethod : 'Lainnya'}
                                                                            onValueChange={val => handleItemChange(phase.id, itemIndex, 'checkMethod', val)}
                                                                        >
                                                                            <SelectTrigger>
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {CHECK_METHODS.map(m => (
                                                                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        {(item.checkMethod === 'Lainnya' || !CHECK_METHODS.includes(item.checkMethod)) && (
                                                                            <Input
                                                                                value={item.checkMethod === 'Lainnya' ? '' : item.checkMethod}
                                                                                onChange={e => handleItemChange(phase.id, itemIndex, 'checkMethod', e.target.value)}
                                                                                placeholder="Metode lain..."
                                                                                className="h-8 text-sm"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="col-span-2 space-y-2">
                                                                    <Label>Kriteria</Label>
                                                                    <Textarea
                                                                        value={item.criteria}
                                                                        onChange={e => handleItemChange(phase.id, itemIndex, 'criteria', e.target.value)}
                                                                        placeholder="Kriteria penerimaan..."
                                                                        className="h-20"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <Checkbox
                                                                        checked={item.isMandatory}
                                                                        onCheckedChange={c => handleItemChange(phase.id, itemIndex, 'isMandatory', c)}
                                                                    />
                                                                    <Label>Wajib</Label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full border-dashed"
                                                        onClick={() => handleAddItem(phase.id)}
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Tambah Item QC di {phase.name || 'Fase Ini'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Simpan Template
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
