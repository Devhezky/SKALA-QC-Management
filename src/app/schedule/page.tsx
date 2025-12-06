'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, List as ListIcon, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScheduleCalendar } from '@/components/schedule/ScheduleCalendar'
import { ScheduleList } from '@/components/schedule/ScheduleList'
import { toast } from 'sonner'

interface Event {
    id: string
    title: string
    date: string
    type: 'DEADLINE' | 'INSPECTION'
    projectId: string
    projectName: string
    description?: string
    status: string
}

export default function SchedulePage() {
    const [view, setView] = useState<'calendar' | 'list'>('calendar')
    const [events, setEvents] = useState<Event[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const fetchSchedule = async () => {
        try {
            const response = await fetch('/api/schedule')
            if (response.ok) {
                const data = await response.json()
                setEvents(data)
            } else {
                toast.error('Failed to load schedule')
            }
        } catch (error) {
            console.error('Error fetching schedule:', error)
            toast.error('Failed to load schedule')
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }

    const handleRefresh = () => {
        setIsRefreshing(true)
        fetchSchedule()
    }

    useEffect(() => {
        fetchSchedule()
    }, [])

    return (
        <div className="h-full bg-gray-50 font-sans flex flex-col">
            <div className="flex-1 overflow-auto p-8">
                <header className="mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
                            <p className="text-sm text-gray-500 mt-1">Manage project deadlines and inspection schedules</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                                Refresh Data
                            </Button>
                        </div>
                    </div>
                </header>

                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <div className="min-h-0">
                        {view === 'calendar' ? (
                            <ScheduleCalendar events={events} />
                        ) : (
                            <ScheduleList events={events} />
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
