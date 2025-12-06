"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { LucideIcon } from 'lucide-react'

export interface PinnedProject {
    id: string
    name: string
    code: string
    url: string
    icon?: LucideIcon
}

interface PinnedProjectsContextType {
    pinnedProjects: PinnedProject[]
    pinProject: (project: PinnedProject) => void
    unpinProject: (projectId: string) => void
    isPinned: (projectId: string) => boolean
}

const PinnedProjectsContext = createContext<PinnedProjectsContextType | undefined>(undefined)

export function PinnedProjectsProvider({ children }: { children: React.ReactNode }) {
    const [pinnedProjects, setPinnedProjects] = useState<PinnedProject[]>([])

    useEffect(() => {
        const saved = localStorage.getItem('pinnedProjects')
        if (saved) {
            try {
                setPinnedProjects(JSON.parse(saved))
            } catch (e) {
                console.error('Failed to parse pinned projects', e)
            }
        }
    }, [])

    const savePinnedProjects = (projects: PinnedProject[]) => {
        setPinnedProjects(projects)
        localStorage.setItem('pinnedProjects', JSON.stringify(projects))
    }

    const pinProject = (project: PinnedProject) => {
        if (!pinnedProjects.some(p => p.id === project.id)) {
            const newProjects = [...pinnedProjects, project]
            savePinnedProjects(newProjects)
        }
    }

    const unpinProject = (projectId: string) => {
        const newProjects = pinnedProjects.filter(p => p.id !== projectId)
        savePinnedProjects(newProjects)
    }

    const isPinned = (projectId: string) => {
        return pinnedProjects.some(p => p.id === projectId)
    }

    return (
        <PinnedProjectsContext.Provider value={{ pinnedProjects, pinProject, unpinProject, isPinned }}>
            {children}
        </PinnedProjectsContext.Provider>
    )
}

export function usePinnedProjects() {
    const context = useContext(PinnedProjectsContext)
    if (context === undefined) {
        throw new Error('usePinnedProjects must be used within a PinnedProjectsProvider')
    }
    return context
}
