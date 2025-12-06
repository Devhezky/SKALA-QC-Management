'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  ArrowLeft,
  FileText,
  User,
  Calendar,
  Eye
} from 'lucide-react'

interface Inspection {
  id: string
  project: {
    id: string
    name: string
    code: string
    clientName: string
  }
  phase: {
    id: string
    name: string
  }
  inspector: {
    name: string
  }
  status: string
  score: number
  comments: string
  submittedAt: string
  items: Array<{
    id: string
    template: {
      code: string
      title: string
      isMandatory: boolean
    }
    status: string
    measuredValue: string
    notes: string
  }>
  signatures: Array<{
    id: string
    signer: {
      name: string
    }
    signerRole: string
    status: string
    comments: string
    signedAt: string
  }>
}

interface ApprovalScreenProps {
  inspection: Inspection
  onBack: () => void
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'APPROVED':
      return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Disetujui</Badge>
    case 'REJECTED':
      return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Ditolak</Badge>
    case 'PENDING':
      return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getItemStatusBadge(status: string) {
  switch (status) {
    case 'OK':
      return <Badge className="bg-green-100 text-green-800 text-xs">OK</Badge>
    case 'NOT_OK':
      return <Badge className="bg-red-100 text-red-800 text-xs">NOT OK</Badge>
    case 'NA':
      return <Badge className="bg-gray-100 text-gray-800 text-xs">N/A</Badge>
    default:
      return <Badge variant="outline" className="text-xs">PENDING</Badge>
  }
}

function getScoreColor(score: number) {
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

export default function ApprovalScreen({ inspection, onBack }: ApprovalScreenProps) {
  const [rejectComments, setRejectComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('summary')

  const okItems = inspection.items.filter(item => item.status === 'OK')
  const notOkItems = inspection.items.filter(item => item.status === 'NOT_OK')
  const naItems = inspection.items.filter(item => item.status === 'NA')
  const mandatoryNotOk = inspection.items.filter(item => 
    item.template.isMandatory && item.status === 'NOT_OK'
  )

  const handleApprove = async () => {
    setIsSubmitting(true)
    try {
      // TODO: Implement approve API call
      console.log('Approving inspection:', inspection.id)
      onBack()
    } catch (error) {
      console.error('Error approving inspection:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectComments.trim()) {
      alert('Harap isi alasan penolakan')
      return
    }

    setIsSubmitting(true)
    try {
      // TODO: Implement reject API call
      console.log('Rejecting inspection:', inspection.id, rejectComments)
      onBack()
    } catch (error) {
      console.error('Error rejecting inspection:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Review & Tanda Tangan Fase</h1>
                <p className="text-sm text-gray-600">
                  {inspection.project.code} - {inspection.project.name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">{inspection.phase.name}</Badge>
              {getStatusBadge(inspection.status)}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Ringkasan</TabsTrigger>
            <TabsTrigger value="details">Detail Checklist</TabsTrigger>
            <TabsTrigger value="signatures">Tanda Tangan</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            {/* Inspection Summary */}
            <Card>
              <CardHeader>
                <CardTitle>📋 Ringkasan Inspeksi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Informasi Inspeksi</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pemeriksa:</span>
                        <span className="font-medium">{inspection.inspector.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tanggal Inspeksi:</span>
                        <span className="font-medium">
                          {new Date(inspection.submittedAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        {getStatusBadge(inspection.status)}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Hasil Pemeriksaan</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Skor Kelayakan:</span>
                        <span className={`font-bold text-lg ${getScoreColor(inspection.score)}`}>
                          {typeof inspection.score === 'number' ? inspection.score.toFixed(1) : inspection.score}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Item OK:</span>
                        <span className="font-medium text-green-600">{okItems.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Item NOT OK:</span>
                        <span className="font-medium text-red-600">{notOkItems.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Item N/A:</span>
                        <span className="font-medium text-gray-600">{naItems.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {inspection.comments && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-2">Komentar QC</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {inspection.comments}
                    </p>
                  </div>
                )}

                {mandatoryNotOk.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-red-600 mb-2">⚠️ Item Wajib Tidak Lulus</h4>
                    <div className="space-y-2">
                      {mandatoryNotOk.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded">
                          <span className="text-sm font-medium text-red-800">
                            {item.template.code} - {item.template.title}
                          </span>
                          {getItemStatusBadge(item.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action */}
            <Card>
              <CardHeader>
                <CardTitle>✍️ Tindakan Anda</CardTitle>
                <CardDescription>
                  Berikan persetujuan atau tolak hasil inspeksi ini
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Memproses...' : 'SETUJUI & TANDA TANGANI'}
                  </Button>
                  
                  <div className="space-y-2">
                    <Button 
                      variant="destructive"
                      onClick={handleReject}
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      TOLAK DENGAN CATATAN
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="rejectComments">Alasan Penolakan (jika ditolak)</Label>
                  <Textarea
                    id="rejectComments"
                    value={rejectComments}
                    onChange={(e) => setRejectComments(e.target.value)}
                    placeholder="Masukkan alasan penolakan..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📝 Detail Checklist Item</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {inspection.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{item.template.code}</span>
                          <span>{item.template.title}</span>
                          {item.template.isMandatory && (
                            <Badge variant="destructive" className="text-xs">WAJIB</Badge>
                          )}
                        </div>
                        {item.measuredValue && (
                          <p className="text-sm text-gray-600 mt-1">
                            Nilai: {item.measuredValue}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-sm text-gray-600 mt-1">
                            Catatan: {item.notes}
                          </p>
                        )}
                      </div>
                      {getItemStatusBadge(item.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signatures" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🖋️ Tanda Tangan Digital</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {inspection.signatures.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Tanda Tangan</h3>
                      <p className="text-gray-600">Inspeksi ini belum ditandatangani oleh siapa pun</p>
                    </div>
                  ) : (
                    inspection.signatures.map((signature, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">{signature.signer.name}</h4>
                            <p className="text-sm text-gray-600">{signature.signerRole}</p>
                            {signature.signedAt && (
                              <p className="text-xs text-gray-500">
                                {new Date(signature.signedAt).toLocaleString('id-ID')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(signature.status)}
                          {signature.comments && (
                            <p className="text-sm text-gray-600 mt-1">{signature.comments}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
