"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { archiveProject, unarchiveProject } from "@/app/actions/projects";
import { Archive, FolderOpen, MoreVertical, Pencil, Clock, Activity, RotateCcw } from "lucide-react";
import { useState, useTransition } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ProjectDialog } from "./project-dialog";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  color: string;
  description: string | null;
  archived: boolean;
  _count: {
    activities: number;
  };
  activities: { createdAt: Date }[];
}

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showEdit, setShowEdit] = useState(false);

  const handleArchive = () => {
    startTransition(async () => {
      await archiveProject(project.id);
    });
  };

  const handleUnarchive = () => {
    startTransition(async () => {
      await unarchiveProject(project.id);
    });
  };

  const lastActive = project.activities[0]?.createdAt;

  return (
    <>
      <Card className={cn("bg-card border-border/50 group hover:border-border transition-all hover:shadow-sm flex flex-col h-full relative overflow-hidden", project.archived && "opacity-75 bg-muted/20 border-border/30")}>
        {/* Make the whole card clickable via overlay or wrapping content */}
        <Link href={`/projects/${project.id}`} className="flex flex-col flex-1 h-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl">
            <CardContent className="p-5 flex-1 relative">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
                <div 
                    className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 duration-300 relative"
                    style={{ backgroundColor: project.archived ? "hsl(var(--muted))" : `${project.color}10` }}
                >
                    <FolderOpen className="h-7 w-7" style={{ color: project.archived ? "hsl(var(--muted-foreground))" : project.color }} />
                    {project.archived && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-2xl">
                            <Archive className="h-4 w-4 text-muted-foreground" />
                        </div>
                    )}
                </div>
            </div>

            {/* Title & Desc */}
            <div className="space-y-2">
                <h3 className={cn("font-bold text-xl text-foreground truncate transition-colors pr-8", !project.archived && "group-hover:text-primary")}>
                    {project.name}
                </h3>
                
                {/* Description with fixed height for alignment */}
                <div className="min-h-[2.5rem]">
                    {project.description ? (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {project.description}
                        </p>
                    ) : (
                        // Spacer to keep card height consistent without visual noise
                        <div className="h-full w-full" aria-hidden="true" />
                    )}
                </div>
            </div>
            </CardContent>

            {/* Footer Stats */}
            <CardFooter className="p-5 pt-0 flex flex-col gap-2 mt-auto">
                <div className="w-full h-px bg-border/50 mb-2" />
                
                <div className="flex items-center justify-between w-full text-xs text-muted-foreground gap-4">
                    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/40" title="Total Activities Logged">
                        <Activity className="h-3.5 w-3.5" /> 
                        <span className="font-medium">{project._count.activities}</span> entries
                    </div>
                    {lastActive && (
                        <div className="flex items-center gap-1.5 px-2 py-1" title="Last Activity">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDistanceToNow(new Date(lastActive))} ago
                        </div>
                    )}
                </div>
            </CardFooter>
        </Link>
        
        {/* Floating Menu Action (Absolute positioned to sit on top of Link) */}
        <div className="absolute top-5 right-5 z-10">
             <DropdownMenu>
               <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                 <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity hover:bg-muted">
                   <MoreVertical className="h-4 w-4" />
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                 <DropdownMenuItem asChild>
                    <Link href={`/projects/${project.id}`} className="cursor-pointer">
                        <Activity className="mr-2 h-4 w-4" /> View Timeline
                    </Link>
                 </DropdownMenuItem>
                 
                 {!project.archived && (
                    <DropdownMenuItem onClick={() => setShowEdit(true)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit Details
                    </DropdownMenuItem>
                 )}

                 {project.archived ? (
                     <DropdownMenuItem onClick={handleUnarchive} className="text-primary focus:text-primary font-medium">
                        <RotateCcw className="mr-2 h-4 w-4" /> Restore Project
                     </DropdownMenuItem>
                 ) : (
                    <DropdownMenuItem onClick={handleArchive} className="text-destructive focus:text-destructive">
                        <Archive className="mr-2 h-4 w-4" /> Archive Project
                    </DropdownMenuItem>
                 )}
               </DropdownMenuContent>
             </DropdownMenu>
        </div>
      </Card>

      <ProjectDialog 
        open={showEdit} 
        onOpenChange={setShowEdit} 
        project={project} 
      />
    </>
  );
}
