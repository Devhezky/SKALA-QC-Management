import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ProjectDetailLoading() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Skeleton */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Skeleton className="h-8 w-48" />
                        <div className="flex items-center space-x-4">
                            <Skeleton className="h-9 w-64" />
                            <Skeleton className="h-9 w-32" />
                            <Skeleton className="h-9 w-24" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Skeleton */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tabs Skeleton */}
                <div className="mb-6">
                    <Skeleton className="h-10 w-full max-w-2xl rounded-md" />
                </div>

                <div className="space-y-6">
                    {/* Project Summary Skeleton */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-6 w-64" />
                                <Skeleton className="h-6 w-24 rounded-full" />
                            </div>
                            <Skeleton className="h-4 w-96 mt-2" />
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="text-center">
                                        <Skeleton className="h-8 w-16 mx-auto mb-2" />
                                        <Skeleton className="h-4 w-32 mx-auto" />
                                        {i === 1 && <Skeleton className="h-2 w-full mt-2 rounded-full" />}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Phase Status Skeleton */}
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <Skeleton className="h-6 w-40" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <Skeleton className="h-5 w-48" />
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <Skeleton className="h-6 w-12" />
                                            <Skeleton className="h-6 w-24 rounded-full" />
                                            <Skeleton className="h-8 w-8 rounded-md" />
                                            <Skeleton className="h-8 w-20 rounded-md" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
