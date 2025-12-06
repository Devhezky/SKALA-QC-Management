'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react'

export function DigitalSignatureSettings() {
    const [signature, setSignature] = useState<string | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        const savedSignature = localStorage.getItem('digitalSignature')
        if (savedSignature) {
            setSignature(savedSignature)
        }
    }, [])

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            toast({
                title: "File too large",
                description: "Please upload an image smaller than 2MB.",
                variant: "destructive"
            })
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            const base64String = reader.result as string
            setSignature(base64String)
            localStorage.setItem('digitalSignature', base64String)
            toast({
                title: "Signature Saved",
                description: "Your digital signature has been saved locally."
            })
        }
        reader.readAsDataURL(file)
    }

    const handleRemoveSignature = () => {
        setSignature(null)
        localStorage.removeItem('digitalSignature')
        toast({
            title: "Signature Removed",
            description: "Your digital signature has been removed."
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Digital Signature</CardTitle>
                <CardDescription>
                    Upload your digital signature or company stamp. This will be automatically applied to PDF reports.
                    <br />
                    <span className="text-xs text-muted-foreground italic">
                        Note: The signature is saved locally on this device.
                    </span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="signature-upload">Upload Signature Image</Label>
                    <Input
                        id="signature-upload"
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={handleImageUpload}
                        className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                        Recommended: Transparent PNG, max 2MB.
                    </p>
                </div>

                {signature ? (
                    <div className="space-y-2">
                        <Label>Preview</Label>
                        <div className="border rounded-lg p-4 bg-slate-50 flex flex-col items-center justify-center gap-4">
                            <div className="relative w-48 h-24 border-2 border-dashed border-slate-300 rounded flex items-center justify-center bg-white overflow-hidden">
                                <img
                                    src={signature}
                                    alt="Digital Signature Preview"
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleRemoveSignature}
                                className="flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Remove Signature
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 flex flex-col items-center justify-center text-muted-foreground bg-slate-50">
                        <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                        <p className="text-sm">No signature uploaded</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
