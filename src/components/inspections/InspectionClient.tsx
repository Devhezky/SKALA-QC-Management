'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, Upload, Save, Send, FileText, Trash2, PlayCircle, Loader2, Eraser } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { updateInspectionItem, uploadAttachment, deleteAttachment, updateInspectionStatus, createSignature } from '@/app/projects/[id]/actions'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import SignatureCanvas from 'react-signature-canvas'

interface InspectionClientProps {
    inspection: any
}

export default function InspectionClient({ inspection }: InspectionClientProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [items, setItems] = useState(inspection.items)
    const [uploadingItem, setUploadingItem] = useState<string | null>(null)
    const [previewFile, setPreviewFile] = useState<{ url: string, type: 'PHOTO' | 'VIDEO' } | null>(null)

    // Signature State
    const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false)
    const sigCanvas = useRef<SignatureCanvas>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSavingDraft, setIsSavingDraft] = useState(false)

    // Calculate progress
    const totalItems = items.length
    const completedItems = items.filter((i: any) => i.status !== 'PENDING').length
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

    // Calculate score
    const scoredItems = items.filter((i: any) => i.status !== 'PENDING' && i.status !== 'NA')
    const currentScore = scoredItems.length > 0
        ? Math.round(scoredItems.reduce((acc: number, i: any) => acc + (i.status === 'OK' ? 100 : 0), 0) / scoredItems.length)
        : 0

    const handleStatusUpdate = async (itemId: string, status: 'OK' | 'NOT_OK' | 'NA') => {
        // Optimistic update
        const oldItems = [...items]
        setItems(items.map((i: any) => i.id === itemId ? { ...i, status } : i))

        try {
            await updateInspectionItem(itemId, { status })
        } catch (error) {
            // Revert on error
            setItems(oldItems)
            toast({
                title: "Error",
                description: "Gagal mengupdate status",
                variant: "destructive"
            })
        }
    }

    const handleNotesUpdate = async (itemId: string, notes: string) => {
        try {
            await updateInspectionItem(itemId, { notes })
        } catch (error) {
            toast({
                title: "Error",
                description: "Gagal menyimpan catatan",
                variant: "destructive"
            })
        }
    }

    const handleFileUpload = async (itemId: string, file: File) => {
        // Validate file type
        const validTypes = [
            'image/jpeg', 'image/png', 'image/webp',
            'video/mp4', 'video/quicktime', 'audio/wav',
            'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .doc, .docx
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xls, .xlsx
            'text/csv'
        ]

        if (!validTypes.includes(file.type) && !file.name.endsWith('.mov')) { // .mov sometimes has empty type or different type depending on browser
            // Fallback check for extensions if type is missing or generic
            const ext = file.name.split('.').pop()?.toLowerCase()
            const validExts = ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'wav', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv']
            if (!ext || !validExts.includes(ext)) {
                toast({
                    title: "Format Salah",
                    description: "Hanya gambar, video, audio (wav), dan dokumen (PDF/Word/Excel/CSV) yang diperbolehkan.",
                    variant: "destructive"
                })
                return
            }
        }

        // Validate file size (e.g., 50MB for video?)
        if (file.size > 50 * 1024 * 1024) {
            toast({
                title: "File Terlalu Besar",
                description: "Maksimal ukuran file adalah 50MB.",
                variant: "destructive"
            })
            return
        }

        setUploadingItem(itemId)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('itemId', itemId)
        formData.append('inspectionId', inspection.id)

        try {
            const attachment = await uploadAttachment(formData)
            // Update local state to show new attachment
            setItems(items.map((i: any) => {
                if (i.id === itemId) {
                    return {
                        ...i,
                        attachments: [...(i.attachments || []), attachment]
                    }
                }
                return i
            }))
            toast({
                title: "Berhasil",
                description: "File berhasil diupload",
            })
        } catch (error) {
            toast({
                title: "Gagal",
                description: "Gagal mengupload file",
                variant: "destructive"
            })
        } finally {
            setUploadingItem(null)
        }
    }

    const handleDeleteAttachment = async (itemId: string, attachmentId: string) => {
        if (!confirm('Hapus file ini?')) return

        try {
            await deleteAttachment(attachmentId)
            setItems(items.map((i: any) => {
                if (i.id === itemId) {
                    return {
                        ...i,
                        attachments: i.attachments.filter((a: any) => a.id !== attachmentId)
                    }
                }
                return i
            }))
            toast({
                title: "Berhasil",
                description: "File dihapus",
            })
        } catch (error) {
            toast({
                title: "Gagal",
                description: "Gagal menghapus file",
                variant: "destructive"
            })
        }
    }

    const handleSaveDraft = async () => {
        setIsSavingDraft(true)
        try {
            await updateInspectionStatus(inspection.id, 'DRAFT')
            toast({
                title: "Berhasil",
                description: "Draft berhasil disimpan",
            })
        } catch (error) {
            console.error('Save draft error:', error)
            toast({
                title: "Gagal",
                description: "Gagal menyimpan draft",
                variant: "destructive"
            })
        } finally {
            setIsSavingDraft(false)
        }
    }

    const handleSubmitClick = () => {
        // Validate if all mandatory items are checked
        const pendingMandatory = items.filter((i: any) => i.template.isMandatory && i.status === 'PENDING')
        if (pendingMandatory.length > 0) {
            toast({
                title: "Belum Lengkap",
                description: `Masih ada ${pendingMandatory.length} item wajib yang belum diperiksa.`,
                variant: "destructive"
            })
            return
        }

        setIsSignatureDialogOpen(true)
    }

    const clearSignature = () => {
        sigCanvas.current?.clear()
    }

    const handleSignatureSubmit = async () => {
        if (sigCanvas.current?.isEmpty()) {
            toast({
                title: "Tanda Tangan Kosong",
                description: "Mohon tanda tangan terlebih dahulu sebelum submit.",
                variant: "destructive"
            })
            return
        }

        setIsSubmitting(true)
        try {
            // Get signature data directly from canvas
            const signatureData = sigCanvas.current?.toDataURL('image/png')

            if (!signatureData) throw new Error("Failed to get signature data")

            // Get QC user ID
            const response = await fetch('/api/users/qc')
            if (!response.ok) {
                throw new Error('Failed to fetch QC user')
            }
            const data = await response.json()

            if (!data.user) {
                throw new Error("No QC inspector found. Please create a user with role QC.")
            }

            console.log('Creating signature for inspection:', inspection.id)
            await createSignature({
                inspectionId: inspection.id,
                signedById: data.user.id,
                signatureData
            })
            console.log('Signature created successfully')

            toast({
                title: "Berhasil",
                description: "Inspeksi berhasil disubmit dan ditandatangani!",
            })

            setIsSignatureDialogOpen(false)
            router.push(`/projects/${inspection.projectId}`)
        } catch (error) {
            console.error(error)
            toast({
                title: "Gagal",
                description: error instanceof Error ? error.message : "Gagal mensubmit inspeksi",
                variant: "destructive"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="text-xl font-bold">{inspection.project.name}</h1>
                                <p className="text-gray-500 text-sm">{inspection.phase.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-2xl font-bold text-red-600">{currentScore}%</div>
                                <div className="text-xs text-gray-500">Skor Kelayakan</div>
                            </div>
                            <div className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
                                {completedItems}/{totalItems}
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">Progress Checklist</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 space-y-6">
                {items.map((item: any) => (
                    <Card key={item.id} className="overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-blue-600">{item.template.code}</span>
                                        <h3 className="font-bold text-lg">{item.template.title}</h3>
                                        {item.template.isMandatory && (
                                            <Badge variant="destructive" className="text-xs">WAJIB</Badge>
                                        )}
                                    </div>
                                    <p className="text-gray-600 text-sm mb-1">
                                        <span className="font-medium">Standar:</span> {item.template.acceptanceCriteria}
                                    </p>
                                    <p className="text-gray-600 text-sm mb-1">
                                        <span className="font-medium">Metode:</span> {item.template.checkMethod}
                                    </p>
                                    <p className="text-gray-600 text-sm">
                                        <span className="font-medium">Bobot:</span> {item.template.weight}
                                    </p>
                                </div>
                                <Badge variant={item.status === 'PENDING' ? 'secondary' : item.status === 'OK' ? 'default' : 'destructive'} className={item.status === 'OK' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                    {item.status}
                                </Badge>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Status Pemeriksaan</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <Button
                                            variant={item.status === 'OK' ? 'default' : 'outline'}
                                            className={item.status === 'OK' ? 'bg-green-600 hover:bg-green-700' : ''}
                                            onClick={() => handleStatusUpdate(item.id, 'OK')}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            OK
                                        </Button>
                                        <Button
                                            variant={item.status === 'NOT_OK' ? 'default' : 'outline'}
                                            className={item.status === 'NOT_OK' ? 'bg-red-600 hover:bg-red-700' : ''}
                                            onClick={() => handleStatusUpdate(item.id, 'NOT_OK')}
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            NOT OK
                                        </Button>
                                        <Button
                                            variant={item.status === 'NA' ? 'default' : 'outline'}
                                            onClick={() => handleStatusUpdate(item.id, 'NA')}
                                        >
                                            <MinusCircle className="w-4 h-4 mr-2" />
                                            N/A
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Catatan</label>
                                    <Textarea
                                        placeholder="Tambahkan catatan jika diperlukan"
                                        defaultValue={item.notes || ''}
                                        onBlur={(e) => handleNotesUpdate(item.id, e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Bukti File</label>

                                    {/* Existing Attachments */}
                                    {item.attachments && item.attachments.length > 0 && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                            {item.attachments.map((att: any) => (
                                                <div key={att.id} className="relative group border rounded-lg overflow-hidden bg-gray-100">
                                                    {att.fileType === 'PHOTO' ? (
                                                        <div
                                                            className="aspect-square relative cursor-pointer"
                                                            onClick={() => setPreviewFile({ url: att.filePath, type: 'PHOTO' })}
                                                        >
                                                            <Image
                                                                src={att.filePath}
                                                                alt={att.filename}
                                                                fill
                                                                className="object-cover hover:scale-105 transition-transform"
                                                            />
                                                        </div>
                                                    ) : att.fileType === 'VIDEO' ? (
                                                        <div
                                                            className="aspect-square flex items-center justify-center relative cursor-pointer"
                                                            onClick={() => setPreviewFile({ url: att.filePath, type: 'VIDEO' })}
                                                        >
                                                            <PlayCircle className="w-10 h-10 text-gray-400 z-10" />
                                                            <video src={att.filePath} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                                        </div>
                                                    ) : (
                                                        <a
                                                            href={att.filePath}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="aspect-square flex flex-col items-center justify-center p-2 text-center hover:bg-gray-200 transition-colors"
                                                        >
                                                            <FileText className="w-8 h-8 text-blue-500 mb-2" />
                                                            <span className="text-xs truncate w-full">{att.filename}</span>
                                                        </a>
                                                    )}

                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleDeleteAttachment(item.id, att.id)
                                                        }}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="relative">
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) handleFileUpload(item.id, file)
                                            }}
                                            accept="image/*,video/*,audio/wav,.pdf,.doc,.docx,.xls,.xlsx,.csv,.mov,.webp"
                                            disabled={uploadingItem === item.id}
                                        />
                                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
                                            {uploadingItem === item.id ? (
                                                <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-2 animate-spin" />
                                            ) : (
                                                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                            )}
                                            <p className="text-sm text-gray-500">
                                                {uploadingItem === item.id ? 'Mengupload...' : 'Klik atau drag file ke sini (Gambar, Video, Dokumen)'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </main>

            {/* Footer Actions - with left padding to account for sidebar */}
            <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t p-4 shadow-lg z-40">
                <div className="container mx-auto flex gap-4">
                    <Button variant="outline" className="flex-1" onClick={handleSaveDraft} disabled={isSavingDraft}>
                        {isSavingDraft ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        {isSavingDraft ? 'Menyimpan...' : 'Simpan Draft'}
                    </Button>
                    <Button className="flex-1 bg-gray-600 hover:bg-gray-700" onClick={handleSubmitClick}>
                        <Send className="w-4 h-4 mr-2" />
                        Submit untuk Review
                    </Button>
                </div>
            </div>

            {/* Signature Dialog */}
            <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tanda Tangan Inspeksi</DialogTitle>
                        <DialogDescription>
                            Silakan tanda tangan di bawah ini untuk mengkonfirmasi hasil inspeksi.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="border rounded-lg p-2 bg-gray-50">
                        <SignatureCanvas
                            ref={sigCanvas}
                            penColor="black"
                            canvasProps={{
                                width: 400,
                                height: 200,
                                className: 'signature-canvas w-full h-48 bg-white border rounded cursor-crosshair'
                            }}
                        />
                    </div>

                    <div className="flex justify-between items-center">
                        <Button variant="outline" size="sm" onClick={clearSignature}>
                            <Eraser className="w-4 h-4 mr-2" />
                            Hapus
                        </Button>
                        <span className="text-xs text-gray-500">Pastikan tanda tangan jelas</span>
                    </div>

                    <DialogFooter className="sm:justify-end gap-2">
                        <Button variant="secondary" onClick={() => setIsSignatureDialogOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleSignatureSubmit} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Konfirmasi & Submit
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* File Preview Dialog */}
            <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90 border-none">
                    <div className="relative w-full h-[80vh] flex items-center justify-center">
                        {previewFile?.type === 'PHOTO' ? (
                            <div className="relative w-full h-full">
                                <Image
                                    src={previewFile.url}
                                    alt="Preview"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        ) : previewFile?.type === 'VIDEO' ? (
                            <video
                                src={previewFile.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-full"
                            />
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
