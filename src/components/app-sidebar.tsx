"use client"

import * as React from "react"
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Settings,
  Calendar,
  User,
  Briefcase,
  Brain,
  LogOut,
  GalleryVerticalEnd,
  Building2,
  Users,
  Link,
} from "lucide-react"

import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "User",
    email: "user@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "QC System",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Projects",
      url: "/projects",
      icon: FolderKanban,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: FileText,
    },
    {
      title: "Schedule",
      url: "/schedule",
      icon: Calendar,
    },
    {
      title: "Clients",
      url: "/clients",
      icon: Building2,
      items: [
        {
          title: "All Clients",
          url: "/clients",
          icon: Building2,
        },
        {
          title: "Contacts",
          url: "/contacts",
          icon: Users,
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      items: [
        {
          title: "Profile Settings",
          url: "/settings?tab=profile",
          icon: User,
        },
        {
          title: "Project Settings",
          url: "/settings?tab=project",
          icon: Briefcase,
        },
        {
          title: "API Settings",
          url: "/settings?tab=api",
          icon: Link,
        },
        {
          title: "AI Analyzer Setting",
          url: "/settings?tab=ai",
          icon: Brain,
        },
        {
          title: "Digital Signature",
          url: "/settings?tab=signature",
          icon: FileText,
        },
      ],
    },
  ],
}

import { usePinnedProjects } from "@/contexts/PinnedProjectsContext"
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { useUser } from "@/contexts/UserContext"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pinnedProjects } = usePinnedProjects()
  const { user } = useUser()
  const pathname = usePathname()

  const userData = user ? {
    name: `${user.firstname} ${user.lastname}`,
    email: user.email,
    avatar: "/avatars/shadcn.jpg", // Fallback avatar
  } : data.user

  const navMain = data.navMain.map((item) => {
    const hasActiveChild = item.items?.some(subItem =>
      subItem.url === "/" ? pathname === "/" : pathname.startsWith(subItem.url)
    )

    const isSelfActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url)

    return {
      ...item,
      isActive: isSelfActive || hasActiveChild,
      items: item.items?.map(subItem => ({
        ...subItem,
        isActive: subItem.url === "/" ? pathname === "/" : pathname.startsWith(subItem.url)
      }))
    }
  })

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={pinnedProjects} />
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 pb-2">
          <InstallPrompt />
        </div>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
