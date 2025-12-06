'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Camera, 
  Save, 
  Send,
  ArrowLeft,
  Upload,
  FileText,
  X,
  Download,
  Play
} from 'lucide-react'

interface ChecklistItem {
  id: string
  code: string
  title: string
  acceptanceCriteria: string
  checkMethod: string
  isMandatory: boolean
  weight: number
  requirePhoto: boolean
  requireValue: boolean
  status: 'PENDING' | 'OK' | 'NOT_OK' | 'NA'
  measuredValue: string
  notes: string
  attachments: Array<{
    id: string
    filename: string
    filePath: string
    fileType: string
  }>
}

interface Project {
  id: string
  code: string
  name: string
  clientName: string
  location: string
  projectType: string
}

interface Phase {
  id: string
  name: string
  order: number
  inspectionId?: string // For edit mode
}

interface ChecklistExecutionProps {
  project: Project
  phase: Phase
  onBack: () => void
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'OK':
      return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> OK</Badge>
    case 'NOT_OK':
      return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> NOT OK</Badge>
    case 'NA':
      return <Badge className="bg-gray-100 text-gray-800">N/A</Badge>
    default:
      return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" /> PENDING</Badge>
  }
}

function getScoreColor(score: number) {
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

export default function ChecklistExecution({ project, phase, onBack }: ChecklistExecutionProps) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [inspectionId, setInspectionId] = useState<string | null>(null)
  const [inspectionStatus, setInspectionStatus] = useState<string>('DRAFT')
  const [previewFile, setPreviewFile] = useState<{
    id: string
    filename: string
    filePath: string
    fileType: string
  } | null>(null)

  const currentItem = items[currentItemIndex]
  const completedItems = items.filter(item => item.status !== 'PENDING').length
  const progress = items.length > 0 ? (completedItems / items.length) * 100 : 0

  // Calculate score
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  const okWeight = items.filter(item => item.status === 'OK').reduce((sum, item) => sum + item.weight, 0)
  const score = totalWeight > 0 ? Math.round((okWeight / totalWeight) * 100 * 10) / 10 : 0

  useEffect(() => {
    fetchChecklistItems()
  }, [project.id, phase.id])

  const fetchChecklistItems = async () => {
    try {
      console.log('Fetching checklist for project:', project.id, 'phase:', phase.id)
      console.log('Edit mode - phase.inspectionId:', (phase as any).inspectionId)
      
      // Check if this is edit mode (inspectionId provided)
      const isEditMode = !!(phase as any).inspectionId
      
      if (isEditMode) {
        console.log('Edit mode detected, fetching specific inspection:', (phase as any).inspectionId)
        
        // Fetch specific inspection for editing
        const inspectionResponse = await fetch(`/api/inspections/${(phase as any).inspectionId}`)
        if (inspectionResponse.ok) {
          const inspection = await inspectionResponse.json()
          console.log('Found inspection for edit:', inspection)
          
          setInspectionId(inspection.id)
          setInspectionStatus(inspection.status)
          
          const sortedItems = inspection.items
            .map((item: any) => ({
              ...item.template,
              id: item.id,
              status: item.status,
              measuredValue: item.measuredValue || '',
              notes: item.notes || '',
              attachments: item.attachments || []
            }))
            .sort((a, b) => {
              // Extract number from code (e.g., "1.1" -> 1.1, "2.10" -> 2.10)
              const aNum = parseFloat(a.code.replace(/[^0-9.]/g, ''))
              const bNum = parseFloat(b.code.replace(/[^0-9.]/g, ''))
              return aNum - bNum
            })
          setItems(sortedItems)
        } else {
          console.error('Failed to fetch inspection for edit')
        }
      } else {
        // Normal mode - try to get existing inspection
        const inspectionsResponse = await fetch(`/api/inspections?projectId=${project.id}&phaseId=${phase.id}`)
        if (inspectionsResponse.ok) {
          const inspections = await inspectionsResponse.json()
          console.log('Existing inspections:', inspections)
          
          // Cari inspection terbaru (baik DRAFT maupun SUBMITTED)
          const existingInspection = inspections.find((i: any) => 
            i.status === 'DRAFT' || i.status === 'SUBMITTED'
          ) || inspections[0] // Ambil yang terbaru jika tidak ada DRAFT/SUBMITTED
          
          if (existingInspection) {
            console.log('Found existing inspection:', existingInspection)
            setInspectionId(existingInspection.id)
            setInspectionStatus(existingInspection.status)
            const sortedItems = existingInspection.items
              .map((item: any) => ({
                ...item.template,
                id: item.id,
                status: item.status,
                measuredValue: item.measuredValue || '',
                notes: item.notes || '',
                attachments: item.attachments || []
              }))
              .sort((a, b) => {
                // Extract number from code (e.g., "1.1" -> 1.1, "2.10" -> 2.10)
                const aNum = parseFloat(a.code.replace(/[^0-9.]/g, ''))
                const bNum = parseFloat(b.code.replace(/[^0-9.]/g, ''))
                return aNum - bNum
              })
            setItems(sortedItems)
          } else {
            console.log('No existing inspection, creating new one...')
            // Create new inspection
            await createNewInspection()
          }
        } else {
          console.error('Failed to fetch inspections')
        }
      }
    } catch (error) {
      console.error('Error fetching checklist items:', error)
    } finally {
      setLoading(false)
    }
  }

  const createNewInspection = async () => {
    try {
      console.log('Creating new inspection...')
      
      // First, get appropriate template for this project type
      const templatesResponse = await fetch('/api/templates')
      let templateId = 'default-template'
      
      if (templatesResponse.ok) {
        const templates = await templatesResponse.json()
        console.log('Available templates:', templates)
        console.log('Project type:', project.projectType)
        
        const appropriateTemplate = templates.find((t: any) => 
          t.projectType === project.projectType
        )
        if (appropriateTemplate) {
          templateId = appropriateTemplate.id
          console.log('Found appropriate template:', appropriateTemplate)
        } else if (templates.length > 0) {
          templateId = templates[0].id // Fallback to first available template
          console.log('Using fallback template:', templates[0])
        } else {
          console.error('No templates available!')
        }
      } else {
        console.error('Failed to fetch templates')
      }

      console.log('Using templateId:', templateId)

      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          phaseId: phase.id,
          templateId: templateId
          // inspectorId will be set by backend
        })
      })

        if (response.ok) {
        const inspection = await response.json()
        console.log('Created inspection:', inspection)
        
        const sortedItems = inspection.items.map((item: any) => ({
          ...item.template,
          id: item.id,
          status: item.status,
          measuredValue: item.measuredValue || '',
          notes: item.notes || '',
          attachments: item.attachments || []
        })).sort((a, b) => {
          // Extract number from code (e.g., "1.1" -> 1.1, "2.10" -> 2.10)
          const aNum = parseFloat(a.code.replace(/[^0-9.]/g, ''))
          const bNum = parseFloat(b.code.replace(/[^0-9.]/g, ''))
          return aNum - bNum
        })
        
        setItems(sortedItems)
        setInspectionId(inspection.id)
        
        // Trigger score calculation
        await calculateInspectionScore(inspection.id)
      } else {
        const errorText = await response.text()
        console.error('Failed to create inspection:', response.status, errorText)
      }
    } catch (error) {
      console.error('Error creating inspection:', error)
    }
  }

  const updateItemStatus = async (itemId: string, status: 'OK' | 'NOT_OK' | 'NA') => {
    // Update local state
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, status } : item
    ))

    // Update in backend
    try {
      const response = await fetch('/api/inspections/items', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          status,
          measuredValue: items.find(item => item.id === itemId)?.measuredValue || '',
          notes: items.find(item => item.id === itemId)?.notes || ''
        })
      })

      if (!response.ok) {
        console.error('Failed to update item')
      } else {
        console.log('Item status updated successfully')
        
        // Check if this was a critical item that was fixed
        const updatedItem = items.find(item => item.id === itemId)
        if (updatedItem && updatedItem.isMandatory && status === 'OK' && 
            (items.find(item => item.id === itemId)?.status === 'NOT_OK')) {
          console.log('Critical item fixed:', updatedItem.code)
          // Show success notification
          alert(`✅ Item kritis ${updatedItem.code} - ${updatedItem.title} berhasil diperbaiki!`)
        }
        
        // Trigger score recalculation
        await calculateInspectionScore(inspectionId!)
      }
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  const updateItemField = async (itemId: string, field: 'measuredValue' | 'notes', value: string) => {
    // Update local state
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ))

    // Update in backend
    try {
      const response = await fetch('/api/inspections/items', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          status: items.find(item => item.id === itemId)?.status || 'PENDING',
          measuredValue: field === 'measuredValue' ? value : items.find(item => item.id === itemId)?.measuredValue || '',
          notes: field === 'notes' ? value : items.find(item => item.id === itemId)?.notes || ''
        })
      })

      if (!response.ok) {
        console.error('Failed to update item')
      }
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  const [criticalItems, setCriticalItems] = useState<Array<{
    id: string
    code: string
    title: string
    phase: string
    status: string
  }>>([])

  // Update critical items when status changes
  useEffect(() => {
    const newCriticalItems = items
      .filter(item => item.isMandatory && item.status === 'NOT_OK')
      .map(item => ({
        id: item.id,
        code: item.code,
        title: item.title,
        phase: phase.name,
        status: item.status
      }))

    // Only update if list actually changed
    const currentCriticalIds = criticalItems.map(item => item.id).sort().join(',')
    const newCriticalIds = newCriticalItems.map(item => item.id).sort().join(',')
    
    if (currentCriticalIds !== newCriticalIds) {
      setCriticalItems(newCriticalItems)
      console.log('Critical items updated:', newCriticalItems)
    }
  }, [items, phase.name])

  const calculateInspectionScore = async (inspectionId: string) => {
    try {
      const response = await fetch(`/api/inspections/${inspectionId}/calculate-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const { score } = await response.json()
        console.log('Score calculated:', score)
        // Score is calculated locally based on items state
      } else {
        console.error('Failed to calculate score')
      }
    } catch (error) {
      console.error('Error calculating score:', error)
    }
  }

  const goToPreviousItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1)
    }
  }

  const goToNextItem = () => {
    if (currentItemIndex < items.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1)
    }
  }

  const saveDraft = async () => {
    try {
      if (!inspectionId) {
        console.error('No inspection to save')
        return
      }

      // Save current inspection state
      const response = await fetch(`/api/inspections/${inspectionId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            status: item.status,
            measuredValue: item.measuredValue,
            notes: item.notes
          }))
        })
      })

      if (response.ok) {
        console.log('Draft saved successfully')
        // Show success message
        alert('Draft berhasil disimpan!')
      } else {
        const errorText = await response.text()
        console.error('Failed to save draft:', response.status, errorText)
        alert('Gagal menyimpan draft. Silakan coba lagi.')
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      alert('Terjadi kesalahan saat menyimpan draft.')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !currentItem) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 
                         'video/mp4', 'video/quicktime', 'video/x-msvideo',
                         'application/pdf', 'application/msword', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    
    if (!allowedTypes.includes(file.type)) {
      alert('File type not allowed. Only images, videos, and documents are allowed.')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size too large. Maximum size is 10MB.')
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('inspectionItemId', currentItem.id)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const fileData = await response.json()
        
        // Update local state with new attachment
        setItems(prev => prev.map(item => 
          item.id === currentItem.id 
            ? { 
                ...item, 
                attachments: [...item.attachments, {
                  id: fileData.id,
                  filename: fileData.originalName,
                  filePath: fileData.filePath,
                  fileType: fileData.fileType
                }]
              }
            : item
        ))

        alert('File uploaded successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to upload file: ${error.error}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload file. Please try again.')
    }

    // Reset file input
    event.target.value = ''
  }

  const handleFilePreview = (attachment: {
    id: string
    filename: string
    filePath: string
    fileType: string
  }) => {
    setPreviewFile(attachment)
  }

  const handleFileDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      const response = await fetch(`/api/upload/${attachmentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Update local state to remove attachment
        setItems(prev => prev.map(item => 
          item.id === currentItem.id 
            ? { 
                ...item, 
                attachments: item.attachments.filter(att => att.id !== attachmentId)
              }
            : item
        ))

        alert('File deleted successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to delete file: ${error.error}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete file. Please try again.')
    }
  }

  const submitInspection = async () => {
    setIsSubmitting(true)
    try {
      if (inspectionId) {
        // First save the current state before submitting
        await saveDraft()
        
        const response = await fetch(`/api/inspections/${inspectionId}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (response.ok) {
          const updatedInspection = await response.json()
          setInspectionStatus(updatedInspection.status)
          alert('Inspection submitted successfully!')
          onBack()
        } else {
          const errorData = await response.json()
          console.error('Submission failed:', errorData)
          alert(`Failed to submit inspection: ${errorData.error || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('Error submitting inspection:', error)
      alert('An error occurred while submitting the inspection. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checklist...</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Tidak ada checklist untuk fase ini</p>
          <Button onClick={onBack} className="mt-4">Kembali</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Optimized for mobile */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBack}
                className="p-2 sm:p-2 h-8 sm:h-10 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-lg font-semibold text-gray-900 truncate">
                  {project.name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  {phase.name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="text-right min-w-0">
                <div className={`text-lg sm:text-2xl font-bold ${getScoreColor(score)}`}>{typeof score === 'number' ? score.toFixed(1) : score}%</div>
                <div className="text-xs text-gray-600 hidden sm:block">Skor Kelayakan</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-xs sm:text-sm">
                  {completedItems}/{items.length}
                </Badge>
                {inspectionStatus === 'SUBMITTED' && (
                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                    ✓ Submitted
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar - Optimized for mobile */}
      <div className="bg-white border-b sticky top-14 sm:top-16 z-10">
        <div className="px-3 sm:px-4 lg:px-8 py-2 sm:py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Progress Checklist</span>
            <span className="text-xs sm:text-sm text-gray-600">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5 sm:h-2" />
        </div>
      </div>

      {/* Main Content - Optimized for mobile */}
      <main className="px-3 sm:px-4 lg:px-8 py-4 sm:py-8 pb-20">
        {/* Critical Items Alert */}
        {criticalItems.length > 0 && (
          <Card className="mb-4 sm:mb-6 border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-800 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Item Kritis Perlu Perbaikan
                <Badge variant="destructive" className="ml-2">
                  {criticalItems.length} Item
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {criticalItems.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                    <div className="flex-1">
                      <div className="font-medium text-red-800">{item.code}</div>
                      <div className="text-sm text-red-600">{item.title}</div>
                      <div className="text-xs text-gray-500">{item.phase}</div>
                    </div>
                    <Badge 
                      variant={item.status === 'OK' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {item.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateItemStatus(item.id, 'OK')}
                      className="ml-2 h-8 sm:h-10 text-xs sm:text-sm"
                    >
                      Perbaiki
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {currentItem && (
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-2 sm:space-y-0">
                <div className="flex-1 min-w-0">
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 text-sm sm:text-base">
                    <span className="font-bold text-blue-600">{currentItem.code}</span>
                    <span className="break-words">{currentItem.title}</span>
                    {currentItem.isMandatory && (
                      <Badge variant="destructive" className="text-xs ml-0 sm:ml-2">WAJIB</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">
                    <div className="space-y-1">
                      <div>
                        <span className="font-medium">Standar:</span>
                        <span className="ml-1 break-words">{currentItem.acceptanceCriteria}</span>
                      </div>
                      <div>
                        <span className="font-medium">Metode:</span>
                        <span className="ml-1">{currentItem.checkMethod}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium">Bobot:</span>
                        <span className="ml-1">{currentItem.weight}</span>
                      </div>
                    </div>
                  </CardDescription>
                </div>
                {getStatusBadge(currentItem.status)}
              </div>
            </CardHeader>

            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              {/* Status Selection */}
              <div>
                <Label className="text-sm sm:text-base font-medium">Status Pemeriksaan</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    variant={currentItem.status === 'OK' ? 'default' : 'outline'}
                    className="h-10 sm:h-12 text-xs sm:text-sm"
                    onClick={() => updateItemStatus(currentItem.id, 'OK')}
                    disabled={inspectionStatus === 'SUBMITTED'}
                  >
                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">OK</span>
                    <span className="sm:hidden">✓</span>
                  </Button>
                  <Button
                    variant={currentItem.status === 'NOT_OK' ? 'destructive' : 'outline'}
                    className="h-10 sm:h-12 text-xs sm:text-sm"
                    onClick={() => updateItemStatus(currentItem.id, 'NOT_OK')}
                    disabled={inspectionStatus === 'SUBMITTED'}
                  >
                    <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">NOT OK</span>
                    <span className="sm:hidden">✗</span>
                  </Button>
                  <Button
                    variant={currentItem.status === 'NA' ? 'default' : 'outline'}
                    className="h-10 sm:h-12 text-xs sm:text-sm"
                    onClick={() => updateItemStatus(currentItem.id, 'NA')}
                    disabled={inspectionStatus === 'SUBMITTED'}
                  >
                    <span className="text-xs sm:text-sm">N/A</span>
                  </Button>
                </div>
              </div>

              {/* Measured Value */}
              {currentItem.requireValue && (
                <div>
                  <Label htmlFor="measuredValue" className="text-sm sm:text-base">Nilai Terukur</Label>
                  <Input
                    id="measuredValue"
                    value={currentItem.measuredValue}
                    onChange={(e) => updateItemField(currentItem.id, 'measuredValue', e.target.value)}
                    placeholder="Masukkan nilai terukur"
                    className="mt-1 h-10 sm:h-12 text-sm sm:text-base"
                    disabled={inspectionStatus === 'SUBMITTED'}
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-sm sm:text-base">Catatan</Label>
                <Textarea
                  id="notes"
                  value={currentItem.notes}
                  onChange={(e) => updateItemField(currentItem.id, 'notes', e.target.value)}
                  placeholder="Tambahkan catatan jika diperlukan"
                  className="mt-1 text-sm sm:text-base"
                  rows={2}
                  disabled={inspectionStatus === 'SUBMITTED'}
                />
              </div>

              {/* Attachments */}
              <div>
                <Label className="text-sm sm:text-base font-medium">
                  Bukti File
                  {currentItem.requirePhoto && (
                    <Badge variant="outline" className="ml-2 text-xs">Wajib</Badge>
                  )}
                </Label>
                <div className="mt-2">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileUpload}
                    disabled={inspectionStatus === 'SUBMITTED'}
                  />
                  {currentItem.attachments.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center">
                      <Upload className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 mb-3">Belum ada file</p>
                      <p className="text-xs text-gray-500 mb-3">Supported: Images, Videos, PDF, Word, Excel (Max: 10MB)</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs sm:text-sm"
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        Upload File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {currentItem.attachments.map((attachment, index) => (
                          <div key={index} className="relative group">
                            <div 
                              className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer"
                              onClick={() => handleFilePreview(attachment)}
                            >
                              {attachment.fileType.startsWith('image/') ? (
                                <img 
                                  src={attachment.filePath} 
                                  alt={attachment.filename}
                                  className="w-full h-full object-cover"
                                />
                              ) : attachment.fileType.startsWith('video/') ? (
                                <div className="relative w-full h-full flex items-center justify-center bg-black">
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center">
                                      <Play className="w-6 h-6 text-black" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" />
                              )}
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 sm:w-6 sm:h-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleFileDelete(attachment.id)
                              }}
                            >
                              <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button 
                          variant="outline" 
                          className="aspect-square h-16 sm:h-20 text-xs sm:text-sm"
                          onClick={() => document.getElementById('file-upload')?.click()}
                        >
                          <Upload className="w-4 h-4 sm:w-6 sm:h-6" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">Supported: Images, Videos, PDF, Word, Excel (Max: 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={goToPreviousItem}
                  disabled={currentItemIndex === 0}
                  className="text-xs sm:text-sm"
                >
                  ← Previous
                </Button>
                <div className="text-xs sm:text-sm text-gray-600">
                  Item {currentItemIndex + 1} dari {items.length}
                </div>
                <Button
                  onClick={goToNextItem}
                  disabled={currentItemIndex === items.length - 1}
                  className="text-xs sm:text-sm"
                >
                  Next →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons - Fixed at bottom for mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 sm:p-4 z-20">
          <div className="max-w-4xl mx-auto flex justify-between items-center gap-2 sm:gap-4">
            <Button 
              variant="outline" 
              onClick={saveDraft}
              className="flex-1 text-xs sm:text-sm h-10 sm:h-12"
            >
              <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Simpan Draft</span>
              <span className="sm:hidden">💾</span>
            </Button>
            <Button 
              onClick={submitInspection}
              disabled={completedItems === 0 || isSubmitting}
              className="flex-1 text-xs sm:text-sm h-10 sm:h-12"
            >
              <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              {isSubmitting ? 'Mengirim...' : 'Submit untuk Review'}
            </Button>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold truncate">{previewFile.filename}</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = previewFile.filePath
                    link.download = previewFile.filename
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              {previewFile.fileType.startsWith('image/') ? (
                <img 
                  src={previewFile.filePath} 
                  alt={previewFile.filename}
                  className="max-w-full max-h-[calc(90vh-120px)] object-contain mx-auto"
                />
              ) : previewFile.fileType.startsWith('video/') ? (
                <video 
                  src={previewFile.filePath} 
                  controls
                  className="max-w-full max-h-[calc(90vh-120px)] mx-auto"
                />
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Document preview not available</p>
                  <Button
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = previewFile.filePath
                      link.download = previewFile.filename
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download {previewFile.filename}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
