'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Trash2 } from 'lucide-react'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

import { useState } from 'react'
import { AddTemplateDialog } from '../dialogs/AddTemplateDialog'
import { getTemplateDetails, deleteTemplate } from '@/app/projects/[id]/actions'
import { useToast } from '@/hooks/use-toast'

interface Template {
    id: string
    name: string
    description: string | null
    projectType: string | null
}

interface TemplateTabProps {
    templates: Template[]
    allPhases: any[]
}

export function TemplateTab({ templates, allPhases }: TemplateTabProps) {
    const { toast } = useToast()
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<any>(null)

    const handleEdit = async (templateId: string) => {
        try {
            const details = await getTemplateDetails(templateId)
            if (details) {
                setEditingTemplate(details)
                setIsAddOpen(true)
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Gagal memuat detail template",
                variant: "destructive"
            })
        }
    }

    const handleDelete = async (templateId: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus template ini?')) return

        try {
            await deleteTemplate(templateId)
            toast({
                title: "Berhasil",
                description: "Template berhasil dihapus",
            })
        } catch (error) {
            toast({
                title: "Gagal",
                description: "Gagal menghapus template",
                variant: "destructive"
            })
        }
    }

    const handleCreateNew = () => {
        setEditingTemplate(null)
        setIsAddOpen(true)
    }

    // Group templates by category (projectType)
    const groupedTemplates = templates.reduce((acc, template) => {
        const category = template.projectType || 'Uncategorized'
        if (!acc[category]) {
            acc[category] = []
        }
        acc[category].push(template)
        return acc
    }, {} as Record<string, Template[]>)

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Template QC</h2>
                <Button onClick={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    Buat Template Baru
                </Button>
            </div>

            <Card>
                <CardContent className="p-6">
                    <Accordion type="single" collapsible className="w-full">
                        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                            <AccordionItem key={category} value={category}>
                                <AccordionTrigger className="text-lg font-medium">
                                    {category} ({categoryTemplates.length})
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2 pt-2">
                                        {categoryTemplates.map((template) => (
                                            <div key={template.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="w-5 h-5 text-blue-500" />
                                                    <div>
                                                        <div className="font-medium">{template.name}</div>
                                                        <div className="text-sm text-gray-500">{template.description}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(template.id)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDelete(template.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>

                    {
                        templates.length === 0 && (
                            <div className="text-center py-10 text-gray-500">
                                Belum ada template. Silakan buat template baru.
                            </div>
                        )
                    }
                </CardContent>
            </Card>

            <AddTemplateDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                allPhases={allPhases}
                initialData={editingTemplate}
            />
        </div>
    )
}
