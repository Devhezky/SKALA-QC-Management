'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, Eye, Edit, User, Calendar } from 'lucide-react'

interface PendingInspection {
  id: string
  project: any
  phase: any
  inspector: any
  status: string
  score: number
  comments: string
  submittedAt: string
  statistics: any
}

interface PendingReviewsListProps {
  selectedProject?: string | null
  onReview: (inspection: any) => void
  onEdit: (inspection: any) => void
}

export default function PendingReviewsList({ selectedProject, onReview, onEdit }: PendingReviewsListProps) {
  const [inspections, setInspections] = useState<PendingInspection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPendingInspections()
  }, [selectedProject])

  const fetchPendingInspections = async () => {
    try {
      setLoading(true)
      const url = selectedProject 
        ? `/api/inspections/pending?projectId=${selectedProject}`
        : '/api/inspections/pending'
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setInspections(data)
      }
    } catch (error) {
      console.error('Error fetching pending inspections:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (inspections.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <CheckCircle2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak Ada Review Pending</h3>
          <p className="text-gray-600">
            {selectedProject 
              ? 'Tidak ada inspeksi yang menunggu review untuk proyek ini'
              : 'Semua inspeksi telah di-review atau belum ada yang di-submit'
            }
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {inspections.map((inspection) => (
        <Card key={inspection.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <Badge variant="outline" className="font-mono">
                    {inspection.project?.code || 'N/A'}
                  </Badge>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {inspection.project?.name || 'Unknown Project'}
                  </h3>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {inspection.inspector?.name || 'Unknown Inspector'}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {inspection.submittedAt ? new Date(inspection.submittedAt).toLocaleDateString('id-ID') : 'N/A'}
                  </div>
                </div>

                <div className="flex items-center space-x-4 mb-3">
                  <Badge className="bg-orange-100 text-orange-800">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending Review
                  </Badge>
                  <Badge variant="outline">
                    Score: {typeof inspection.score === 'number' ? inspection.score.toFixed(1) : 'N/A'}%
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col space-y-2 ml-4">
                <Button
                  onClick={() => onReview(inspection)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Review
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onEdit(inspection)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
