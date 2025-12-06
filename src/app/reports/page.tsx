'use client'


import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Brain } from 'lucide-react'

export default function ReportsPage() {
    return (
        <div className="h-full bg-gray-50 font-sans">
            <div className="flex-1 overflow-auto p-8">
                <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                        <p className="text-sm text-gray-500 mt-1">Project summaries and data analysis</p>
                    </div>
                </header>

                <div className="space-y-6">
                    {/* Project Summary Data */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Summary Data</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <div className="text-sm text-blue-600 font-medium">Total Projects</div>
                                    <div className="text-2xl font-bold text-blue-900 mt-1">12</div>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <div className="text-sm text-green-600 font-medium">Completed</div>
                                    <div className="text-2xl font-bold text-green-900 mt-1">8</div>
                                </div>
                                <div className="p-4 bg-yellow-50 rounded-lg">
                                    <div className="text-sm text-yellow-600 font-medium">In Progress</div>
                                    <div className="text-2xl font-bold text-yellow-900 mt-1">4</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* List Active Projects */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <span>List Active Projects</span>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" size="sm">
                                        <Brain className="w-4 h-4 mr-2" />
                                        Analyze with AI
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        <Download className="w-4 h-4 mr-2" />
                                        Export to PDF
                                    </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-gray-500">
                                No active projects data available for report generation yet.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
