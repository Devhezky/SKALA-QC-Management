'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Eye } from 'lucide-react'

interface ApprovalTabProps {
    inspections: any[] // Replace with proper type
}

export function ApprovalTab({ inspections }: ApprovalTabProps) {
    const pendingInspections = inspections.filter(i => i.status === 'SUBMITTED')

    return (
        <Card>
            <CardHeader>
                <CardTitle>Menunggu Persetujuan ({pendingInspections.length})</CardTitle>
            </CardHeader>
            <CardContent>
                {pendingInspections.length > 0 ? (
                    <div className="space-y-4">
                        {pendingInspections.map((inspection) => (
                            <div key={inspection.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                                <div>
                                    <div className="font-medium">{inspection.phase?.name || 'Unknown Phase'}</div>
                                    <div className="text-sm text-gray-600">
                                        Diajukan oleh: {inspection.inspector?.name || 'Unknown'} • {new Date(inspection.submittedAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="bg-white">
                                        <Eye className="w-4 h-4 mr-2" />
                                        Review
                                    </Button>
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Approve
                                    </Button>
                                    <Button size="sm" variant="destructive">
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-500">
                        Tidak ada fase yang menunggu persetujuan saat ini.
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
