'use client'

import { useState } from 'react'
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths
} from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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

interface ScheduleCalendarProps {
    events: Event[]
}

export function ScheduleCalendar({ events }: ScheduleCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date())

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const goToToday = () => setCurrentDate(new Date())

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

    const getEventsForDay = (day: Date) => {
        return events.filter(event => isSameDay(new Date(event.date), day))
    }

    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

    return (
        <Card className="h-full flex flex-col shadow-none border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 px-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={goToToday} className="bg-gray-600 text-white hover:bg-gray-700 hover:text-white border-0">
                            Hari Ini
                        </Button>
                        <Button variant="outline" size="sm" className="bg-gray-800 text-white hover:bg-gray-900 hover:text-white border-0">
                            Perluas
                        </Button>
                    </div>
                    <CardTitle className="text-2xl font-normal">
                        {format(currentDate, 'MMMM yyyy')}
                    </CardTitle>
                </div>
                <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-md">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700 h-8">
                        Bulan
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700 h-8">
                        Minggu
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-700 h-8">
                        Hari
                    </Button>
                    <div className="w-px h-4 bg-gray-600 mx-1"></div>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700 h-8">
                        Filter Berdasarkan
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 border rounded-lg overflow-hidden">
                <div className="grid grid-cols-7 border-b bg-white">
                    {days.map((day) => (
                        <div key={day} className="py-4 text-center text-sm font-medium text-gray-600 border-r last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-fr bg-white">
                    {calendarDays.map((day, dayIdx) => {
                        const dayEvents = getEventsForDay(day)
                        const isCurrentMonth = isSameMonth(day, monthStart)

                        return (
                            <div
                                key={day.toString()}
                                className={`min-h-[150px] border-b border-r p-2 transition-colors relative flex flex-col ${!isCurrentMonth ? 'bg-gray-50/30 text-gray-300' : 'bg-white text-gray-900'
                                    }`}
                            >
                                <div className="flex justify-end mb-2">
                                    <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isSameDay(day, new Date())
                                            ? 'bg-blue-600 text-white'
                                            : ''
                                        }`}>
                                        {format(day, 'd')}
                                    </div>
                                </div>
                                <div className="space-y-1 flex-1 overflow-y-auto max-h-[100px] pr-1 custom-scrollbar">
                                    {dayEvents.map((event) => (
                                        <TooltipProvider key={event.id}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className="text-xs px-2 py-1.5 rounded text-white cursor-pointer font-medium truncate shadow-sm hover:opacity-90 transition-opacity"
                                                        style={{ backgroundColor: '#ff6b00' }}
                                                        onClick={() => window.location.href = `/projects/${event.projectId}`}
                                                    >
                                                        {event.title.replace('Deadline: ', '')}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div className="text-sm">
                                                        <p className="font-bold">{event.projectName}</p>
                                                        <p>{event.description}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{format(new Date(event.date), 'PP p')}</p>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
