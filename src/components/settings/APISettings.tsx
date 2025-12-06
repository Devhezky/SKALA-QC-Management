'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, Eye, EyeOff, ExternalLink, TestTube } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function APISettings() {
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [showApiKey, setShowApiKey] = useState(false)

    const [settings, setSettings] = useState({
        PERFEX_API_URL: '',
        PERFEX_API_KEY: '',
    })

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/settings')
            const data = await response.json()
            if (data.success) {
                setSettings({
                    PERFEX_API_URL: data.settings.PERFEX_API_URL || '',
                    PERFEX_API_KEY: data.settings.PERFEX_API_KEY || '',
                })
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings })
            })
            const data = await response.json()

            if (data.success) {
                toast({
                    title: "Berhasil",
                    description: "API settings berhasil disimpan.",
                })
                fetchSettings() // Refresh to show masked values
            } else {
                throw new Error(data.error)
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Gagal menyimpan settings.",
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleTestConnection = async () => {
        setIsTesting(true)
        try {
            // Use server-side endpoint to avoid CORS
            const response = await fetch('/api/settings/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: settings.PERFEX_API_URL })
            })
            const data = await response.json()

            if (data.success) {
                toast({
                    title: "Koneksi Berhasil",
                    description: data.message,
                })
            } else {
                throw new Error(data.error || 'Connection failed')
            }
        } catch (error: any) {
            toast({
                title: "Koneksi Gagal",
                description: error.message || "Tidak dapat terhubung ke Skala API. Periksa URL dan koneksi.",
                variant: "destructive"
            })
        } finally {
            setIsTesting(false)
        }
    }

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-8 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Skala Integration API</CardTitle>
                    <CardDescription>
                        Konfigurasi koneksi ke sistem Skala (Perfex CRM) untuk sinkronisasi data proyek dan klien.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid w-full max-w-xl items-center gap-1.5">
                        <Label htmlFor="perfex-url">Skala API URL</Label>
                        <div className="flex gap-2">
                            <Input
                                type="url"
                                id="perfex-url"
                                placeholder="http://localhost:8888/skala-new/index.php"
                                value={settings.PERFEX_API_URL}
                                onChange={(e) => setSettings({ ...settings, PERFEX_API_URL: e.target.value })}
                            />
                            {settings.PERFEX_API_URL && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => window.open(settings.PERFEX_API_URL.replace('/index.php', ''), '_blank')}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">
                            URL lengkap ke instalasi Skala/Perfex. Contoh: http://localhost:8888/skala-new/index.php
                        </p>
                    </div>

                    <div className="grid w-full max-w-xl items-center gap-1.5">
                        <Label htmlFor="perfex-key">Skala API Key</Label>
                        <div className="flex gap-2">
                            <Input
                                type={showApiKey ? "text" : "password"}
                                id="perfex-key"
                                placeholder="Masukkan API key dari Skala"
                                value={settings.PERFEX_API_KEY}
                                onChange={(e) => setSettings({ ...settings, PERFEX_API_KEY: e.target.value })}
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShowApiKey(!showApiKey)}
                            >
                                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                            API key dapat dihasilkan dari menu Setup {'>'} API di panel admin Skala.
                        </p>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</>
                            ) : (
                                <><Save className="h-4 w-4 mr-2" /> Simpan Settings</>
                            )}
                        </Button>
                        <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
                            {isTesting ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testing...</>
                            ) : (
                                <><TestTube className="h-4 w-4 mr-2" /> Test Koneksi</>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Catatan Penting</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2">
                    <p>• Settings yang disimpan akan digunakan untuk sinkronisasi data proyek dari Skala.</p>
                    <p>• API Key bersifat sensitif dan akan disimpan dalam bentuk terenkripsi.</p>
                    <p>• Pastikan modul <code className="bg-gray-100 px-1 rounded">qc_integration</code> sudah diaktifkan di Skala.</p>
                </CardContent>
            </Card>
        </div>
    )
}
