'use client'

import { format, isToday, isTomorrow, isPast, isFuture } from 'date-fns'
import { Calendar, Clock, MapPin, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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

interface ScheduleListProps {
    events: Event[]
}

export function ScheduleList({ events }: ScheduleListProps) {
    // Group events by date category
    const groupedEvents = {
        today: events.filter(e => isToday(new Date(e.date))),
        upcoming: events.filter(e => isFuture(new Date(e.date)) && !isToday(new Date(e.date)) && !isTomorrow(new Date(e.date))),
        tomorrow: events.filter(e => isTomorrow(new Date(e.date))),
        past: events.filter(e => isPast(new Date(e.date)) && !isToday(new Date(e.date)))
    }

    const renderEventCard = (event: Event) => (
        <div key={event.id} className="flex items-start gap-4 p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow">
            <div className={`p-2 rounded-full shrink-0 ${event.type === 'DEADLINE' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                }`}>
                {event.type === 'DEADLINE' ? <AlertCircle className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-gray-900 truncate">{event.title}</h4>
                    <Badge variant={event.type === 'DEADLINE' ? 'destructive' : 'secondary'}>
                        {event.type}
                    </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">{event.projectName}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(new Date(event.date), 'PP p')}
                    </div>
                    {event.description && (
                        <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.description}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    return (
        <div className="space-y-8">
            {groupedEvents.today.length > 0 && (
                <section>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Today
                    </h3>
                    <div className="grid gap-4">
                        {groupedEvents.today.map(renderEventCard)}
                    </div>
                </section>
            )}

            {groupedEvents.tomorrow.length > 0 && (
                <section>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Tomorrow
                    </h3>
                    <div className="grid gap-4">
                        {groupedEvents.tomorrow.map(renderEventCard)}
                    </div>
                </section>
            )}

            {groupedEvents.upcoming.length > 0 && (
                <section>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming</h3>
                    <div className="grid gap-4">
                        {groupedEvents.upcoming.map(renderEventCard)}
                    </div>
                </section>
            )}

            {groupedEvents.past.length > 0 && (
                <section>
                    <h3 className="text-lg font-semibold text-gray-500 mb-4">Past Events</h3>
                    <div className="grid gap-4 opacity-75">
                        {groupedEvents.past.map(renderEventCard)}
                    </div>
                </section>
            )}

            {events.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No events found.
                </div>
            )}
        </div>
    )
}
