import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function InspectionLoading() {
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header Skeleton */}
            <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                            <Skeleton className="h-6 w-48 mb-1" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-6 w-24 rounded-full" />
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <Skeleton className="h-3 w-16 mb-1" />
                                <Skeleton className="h-6 w-12 mx-auto" />
                            </div>
                            <div className="h-8 w-px bg-gray-200" />
                            <div className="text-center">
                                <Skeleton className="h-3 w-16 mb-1" />
                                <Skeleton className="h-6 w-12 mx-auto" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-9 w-24 rounded-md" />
                            <Skeleton className="h-9 w-24 rounded-md" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Skeleton */}
            <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                                <Skeleton className="h-6 w-6 mt-1 rounded-full" />
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <Skeleton className="h-5 w-3/4" />
                                        <Skeleton className="h-5 w-16 rounded-full" />
                                    </div>
                                    <Skeleton className="h-4 w-full mb-2" />
                                    <Skeleton className="h-4 w-1/2" />

                                    <div className="flex gap-2 mt-4">
                                        <Skeleton className="h-8 w-20 rounded-md" />
                                        <Skeleton className="h-8 w-20 rounded-md" />
                                        <Skeleton className="h-8 w-20 rounded-md" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </main>
        </div>
    )
}
