"use client"

import {
  Folder,
  Forward,
  MoreHorizontal,
  Trash2,
  PinOff,
  type LucideIcon,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { usePinnedProjects } from "@/contexts/PinnedProjectsContext"

export function NavProjects({
  projects,
}: {
  projects: {
    id: string
    name: string
    code: string
    url: string
    icon?: LucideIcon
  }[]
}) {
  const { isMobile } = useSidebar()
  const { unpinProject } = usePinnedProjects()
  const { toast } = useToast()

  const [projectToShare, setProjectToShare] = useState<{ name: string, url: string } | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const handleShareClick = (project: { name: string, url: string }) => {
    setProjectToShare(project)
    setIsCopied(false)
  }

  const handleCopyLink = () => {
    if (!projectToShare) return

    // Get the full URL
    const fullUrl = `${window.location.origin}${projectToShare.url}`

    navigator.clipboard.writeText(fullUrl).then(() => {
      setIsCopied(true)
      toast({
        title: "Link Copied",
        description: "Project link copied to clipboard",
      })

      setTimeout(() => setIsCopied(false), 2000)
    })
  }

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
        <SidebarMenu>
          {projects.map((item) => {
            const Icon = item.icon || Folder
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild>
                  <a href={item.url}>
                    <Icon />
                    <div className="flex flex-col items-start leading-none min-w-0 w-full">
                      <span className="font-medium truncate w-full">{item.name}</span>
                      <span className="text-xs text-muted-foreground truncate w-full">{item.code}</span>
                    </div>
                  </a>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover>
                      <MoreHorizontal />
                      <span className="sr-only">More</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48 rounded-lg"
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "end" : "start"}
                  >
                    <DropdownMenuItem onClick={() => window.location.href = item.url}>
                      <Folder className="text-muted-foreground" />
                      <span>View Project</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleShareClick(item)}>
                      <Forward className="text-muted-foreground" />
                      <span>Share Project</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => unpinProject(item.id)}>
                      <PinOff className="text-muted-foreground" />
                      <span>Unpin Project</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            )
          })}
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70">
              <MoreHorizontal className="text-sidebar-foreground/70" />
              <span>More</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <Dialog open={!!projectToShare} onOpenChange={(open) => !open && setProjectToShare(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Project</DialogTitle>
            <DialogDescription>
              Salin link di bawah ini untuk membagikan project <strong>{projectToShare?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Input
                id="link"
                defaultValue={projectToShare ? `${typeof window !== 'undefined' ? window.location.origin : ''}${projectToShare.url}` : ''}
                readOnly
              />
            </div>
            <Button type="submit" size="sm" className="px-3" onClick={handleCopyLink}>
              <span className="sr-only">Copy</span>
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
