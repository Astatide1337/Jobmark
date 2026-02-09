"use client";

import { useState } from "react";
import { toast } from "sonner";
import { projectColors } from "@/lib/constants";
import { DashboardFrame } from "./dashboard-frame";
import { ProjectList } from "@/components/projects/project-list";

// Mock Projects that look realistic
const projects = [
  {
    id: "1",
    name: "Website Redesign",
    description: "Updating the landing page for Q1 launch",
    color: "#6366f1", // Indigo
    archived: false,
    _count: { activities: 24 },
    activities: [{ createdAt: new Date() }]
  },
  {
    id: "2",
    name: "Mobile App MVP",
    description: "Core features for iOS beta",
    color: "#10b981", // Emerald
    archived: false,
    _count: { activities: 12 },
    activities: [{ createdAt: new Date() }]
  },
  {
    id: "3",
    name: "Q1 Hiring Strategy",
    description: null,
    color: "#f59e0b", // Amber
    archived: false,
    _count: { activities: 8 },
    activities: [{ createdAt: new Date() }]
  }
];

export function DemoProjects() {
  const [items, setItems] = useState(projects);
  const [filter, setFilter] = useState<"active" | "archived">("active");

  const [viewingId, setViewingId] = useState<string | null>(null);

  const handleCreate = async (data: FormData) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const name = data.get("name") as string;
    const color = data.get("color") as string;
    const description = data.get("description") as string;

    const newProject = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        color: color || projectColors[0],
        description: description || null,
        archived: false,
        _count: { activities: 0 },
        activities: []
    };

    setItems([newProject, ...items]);
    toast.success("Project created (Demo)");
    return { success: true, message: "Created" };
  };

  const handleUpdate = async (id: string, data: FormData) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const name = data.get("name") as string;
    const color = data.get("color") as string;
    const description = data.get("description") as string;

    setItems(items.map(p => 
        p.id === id ? { ...p, name, color, description } : p
    ));
    toast.success("Project updated (Demo)");
    return { success: true, message: "Updated" };
  };

  const handleArchive = async (id: string) => {
      setItems(items.map(p => p.id === id ? { ...p, archived: true } : p));
      toast.success("Project archived");
  };

  const handleUnarchive = async (id: string) => {
      setItems(items.map(p => p.id === id ? { ...p, archived: false } : p));
      toast.success("Project restored");
  };

  // We need to filter items based on the active tab
  const filteredItems = items.filter(item => 
      filter === "active" ? !item.archived : item.archived
  );

  const selectedProject = items.find(p => p.id === viewingId);

  return (
    <DashboardFrame activePath={viewingId ? `/projects/${viewingId}` : "/projects"}>
      <div className="space-y-6">
        <div>
           <h2 className="text-3xl font-bold tracking-tight mb-2">Projects</h2>
           <p className="text-muted-foreground">Organize your workstreams.</p>
        </div>

        {viewingId && selectedProject ? (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setViewingId(null)}
                        className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                    >
                        ← Back to Projects
                    </button>
                </div>
                
                <div className="p-6 rounded-xl border border-border/50 bg-card">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: selectedProject.color }}>
                             <span className="font-bold text-xl">{selectedProject.name.charAt(0)}</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">{selectedProject.name}</h3>
                            <p className="text-muted-foreground text-sm">{selectedProject.description || "No description provided."}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Recent Activity (Demo)</h4>
                        <div className="relative pl-6 border-l-2 border-border/50 space-y-8">
                             {[1, 2, 3].map((i) => (
                                 <div key={i} className="relative">
                                     <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-background" style={{ backgroundColor: selectedProject.color }} />
                                     <div className="bg-muted/30 p-4 rounded-lg">
                                         <p className="font-medium text-sm">Updated project milestones</p>
                                         <p className="text-xs text-muted-foreground mt-1">{i * 2} days ago</p>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>
             </div>
        ) : (
            <ProjectList 
              projects={filteredItems} 
              initialFilter={filter}
              onTabChange={(val) => setFilter(val as any)}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              disableNavigation={true}
              onViewTimeline={(id) => setViewingId(id)}
            />
        )}
      </div>
    </DashboardFrame>
  );
}
