'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function ProjectsError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Projects page error:', error)
    }, [error])

    return (
        <div className="h-full bg-gray-50 font-sans">
            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <Card className="max-w-md mx-auto mt-20">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center">
                                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                    Terjadi Kesalahan
                                </h2>
                                <p className="text-gray-500 mb-2">
                                    Gagal memuat halaman proyek. Silakan coba lagi.
                                </p>
                                <p className="text-xs text-red-600 mb-4 font-mono bg-red-50 p-2 rounded max-w-full overflow-auto">
                                    {error.message || 'Unknown error'}
                                </p>
                                <Button onClick={reset} className="gap-2">
                                    <RefreshCw className="w-4 h-4" />
                                    Coba Lagi
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
