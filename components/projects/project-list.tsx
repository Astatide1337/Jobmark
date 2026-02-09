"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectDialog } from "./project-dialog";
import { ProjectCard } from "./project-card";
import { FolderPlus, Plus, FolderOpen, Archive, Search, ArrowUpDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

export interface ProjectListProps {
  projects: Project[];
  initialFilter: "active" | "archived";
  openCreate?: boolean;
  onCreate?: (data: FormData) => Promise<{ success: boolean; message: string; errors?: any }>;
  onUpdate?: (id: string, data: FormData) => Promise<{ success: boolean; message: string; errors?: any }>;
  onArchive?: (id: string) => Promise<void>;
  onUnarchive?: (id: string) => Promise<void>;
  onTabChange?: (value: string) => void;
  disableNavigation?: boolean;
  onViewTimeline?: (id: string) => void;
}

export function ProjectList({ 
    projects, 
    initialFilter, 
    openCreate = false,
    onCreate,
    onUpdate,
    onArchive,
    onUnarchive,
    onTabChange,
    disableNavigation,
    onViewTimeline
}: ProjectListProps) {
  const [showCreate, setShowCreate] = useState(openCreate);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"recent" | "activity" | "name">("recent");

  // Clear ?new param from URL when modal closes
  useEffect(() => {
    if (openCreate && !showCreate) {
      if (!disableNavigation) {
          router.replace("/projects", { scroll: false });
      }
    }
  }, [showCreate, openCreate, router, disableNavigation]);

  const handleTabChange = (value: string) => {
    if (onTabChange) {
        onTabChange(value);
    } else {
        router.push(`/projects?filter=${value}`);
    }
  };

  // Filter and Sort Logic
  const filteredProjects = projects
    .filter((project) => {
      const query = searchQuery.toLowerCase();
      return (
        project.name.toLowerCase().includes(query) ||
        (project.description && project.description.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      if (sortOption === "recent") {
        const dateA = a.activities[0]?.createdAt ? new Date(a.activities[0].createdAt).getTime() : 0;
        const dateB = b.activities[0]?.createdAt ? new Date(b.activities[0].createdAt).getTime() : 0;
        return dateB - dateA;
      }
      if (sortOption === "activity") {
        return b._count.activities - a._count.activities;
      }
      if (sortOption === "name") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  if (projects.length === 0 && initialFilter === "active") {
    return (
     <>
      <Card className="bg-card/50 border-border/50 border-dashed">
        <CardContent className="py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">No projects yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
            Create projects to organize your activities and generate focused reports.
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Create Your First Project
          </Button>
          
          <div className="mt-8">
             <Button variant="link" size="sm" onClick={() => handleTabChange("archived")}>
                View Archived Projects
             </Button>
          </div>
        </CardContent>
      </Card>
      <ProjectDialog open={showCreate} onOpenChange={setShowCreate} onSubmit={onCreate} />
     </>
    );
  }

  // Handle empty state for archived
  if (projects.length === 0 && initialFilter === "archived") {
      return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Tabs value={initialFilter} onValueChange={handleTabChange} className="w-full sm:w-auto">
                    <TabsList>
                        <TabsTrigger value="active">Active Projects</TabsTrigger>
                        <TabsTrigger value="archived">Archived</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            
            <Card className="bg-card/50 border-border/50 border-dashed">
                <CardContent className="py-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <Archive className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">No archived projects</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                        Projects you archive will appear here safely stored away.
                    </p>
                </CardContent>
            </Card>
        </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
             <Tabs value={initialFilter} onValueChange={handleTabChange} className="w-full sm:w-auto">
                 <TabsList>
                     <TabsTrigger value="active">Active Projects</TabsTrigger>
                     <TabsTrigger value="archived">Archived</TabsTrigger>
                 </TabsList>
             </Tabs>

             {initialFilter === "active" && (
                 <Button onClick={() => setShowCreate(true)} size="sm" className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" /> New Project
                 </Button>
             )}
          </div>

          {/* Toolbar: Search & Sort */}
          <div className="flex items-center gap-3 bg-card/50 p-2 rounded-lg border border-border/50">
             <div className="relative flex-1">
                 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input 
                   placeholder="Search projects..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="pl-9 bg-background border-border/50 h-9"
                 />
             </div>
             
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 shrink-0">
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Sort by:</span>
                        <span className="font-medium">
                            {sortOption === "recent" && "Recent"}
                            {sortOption === "activity" && "Activity"}
                            {sortOption === "name" && "Name"}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortOption("recent")}>
                        Most Recent
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOption("activity")}>
                        Most Activity
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOption("name")}>
                        Name (A-Z)
                    </DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
          </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.length === 0 ? (
           <div className="col-span-full py-12 text-center text-muted-foreground italic">
               No projects match your search.
           </div>
        ) : (
           filteredProjects.map((project) => (
             <ProjectCard 
                key={project.id} 
                project={project} 
                onArchive={onArchive}
                onUnarchive={onUnarchive}
                onUpdate={onUpdate}
                disableNavigation={disableNavigation}
                onViewTimeline={onViewTimeline}
             />
           ))
        )}
      </div>

      <ProjectDialog open={showCreate} onOpenChange={setShowCreate} onSubmit={onCreate} />
    </div>
  );
}
