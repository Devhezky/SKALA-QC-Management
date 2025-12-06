import { NewProjectForm } from '@/components/projects/NewProjectForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewProjectPage() {
    return (
        <div className="container mx-auto py-10">
            <div className="mb-8">
                <Link href="/projects">
                    <Button variant="ghost" className="mb-4 pl-0 hover:pl-0 hover:bg-transparent">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali ke Daftar Proyek
                    </Button>
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Buat Proyek Baru</h1>
                        <p className="text-muted-foreground mt-2">
                            Isi formulir di bawah ini untuk membuat proyek baru.
                        </p>
                    </div>
                    <Button variant="outline" className="gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
                        Sync Project (Perfex CRM)
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-lg border p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-6 border-b pb-4">
                    <Button variant="ghost" className="font-semibold border-b-2 border-black rounded-none px-0 hover:bg-transparent">Proyek</Button>
                    <Button variant="ghost" className="text-muted-foreground px-0 hover:bg-transparent hover:text-black">Pengaturan Proyek</Button>
                </div>
                <NewProjectForm />
            </div>
        </div>
    )
}
