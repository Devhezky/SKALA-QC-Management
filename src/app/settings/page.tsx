'use client'


import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AISettings } from '@/components/ai/AISettings'
import { DigitalSignatureSettings } from '@/components/settings/DigitalSignatureSettings'
import { APISettings } from '@/components/settings/APISettings'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { User, Briefcase, Brain, Loader2, FileText, Link } from 'lucide-react'

function SettingsContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const tabParam = searchParams.get('tab')
    const [activeTab, setActiveTab] = useState('profile')

    useEffect(() => {
        if (tabParam) {
            setActiveTab(tabParam)
        }
    }, [tabParam])

    const handleTabChange = (value: string) => {
        setActiveTab(value)
        router.push(`/settings?tab=${value}`)
    }

    return (
        <div className="h-full bg-gray-50 font-sans">
            <div className="flex-1 overflow-auto p-8">
                <header className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your account and application preferences</p>
                </header>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 lg:w-[750px] h-auto">
                        <TabsTrigger value="profile" className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Profile
                        </TabsTrigger>
                        <TabsTrigger value="project" className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Project
                        </TabsTrigger>
                        <TabsTrigger value="api" className="flex items-center gap-2">
                            <Link className="w-4 h-4" />
                            API
                        </TabsTrigger>
                        <TabsTrigger value="ai" className="flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            AI Analyzer
                        </TabsTrigger>
                        <TabsTrigger value="signature" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Signature
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile">
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label htmlFor="email">Email</Label>
                                    <Input type="email" id="email" placeholder="Email" defaultValue="user@example.com" />
                                </div>
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label htmlFor="name">Name</Label>
                                    <Input type="text" id="name" placeholder="Name" defaultValue="John Doe" />
                                </div>
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label htmlFor="role">Role</Label>
                                    <Input type="text" id="role" placeholder="Role" defaultValue="Project Manager" disabled className="bg-gray-100" />
                                </div>
                                <Button>Save Changes</Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="project">
                        <Card>
                            <CardHeader>
                                <CardTitle>Project Configuration</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-gray-500 mb-4">
                                    Default settings for new projects.
                                </div>
                                <div className="space-y-4">
                                    <div className="grid w-full max-w-sm items-center gap-1.5">
                                        <Label htmlFor="default-currency">Default Currency</Label>
                                        <Input type="text" id="default-currency" defaultValue="IDR" />
                                    </div>
                                    <div className="grid w-full max-w-sm items-center gap-1.5">
                                        <Label htmlFor="timezone">Timezone</Label>
                                        <Input type="text" id="timezone" defaultValue="Asia/Jakarta" />
                                    </div>
                                    <Button>Save Project Settings</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="api">
                        <APISettings />
                    </TabsContent>

                    <TabsContent value="ai">
                        <AISettings />
                    </TabsContent>

                    <TabsContent value="signature">
                        <DigitalSignatureSettings />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        }>
            <SettingsContent />
        </Suspense>
    )
}
