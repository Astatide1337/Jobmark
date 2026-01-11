import { auth } from "@/lib/auth";
import { getProjectDetails } from "@/app/actions/projects";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { notFound, redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Activity, Clock, FolderOpen, ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface ProjectDetailsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { projectId } = await params;
  const project = await getProjectDetails(projectId);

  if (!project) {
    notFound();
  }

  return (
    <DashboardShell
      header={
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          title="Project Details"
        />
      }
    >
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Back navigation */}
        <Link 
            href="/projects" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
        </Link>

        {/* Header Card */}
        <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
                 <div 
                   className="h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
                   style={{ backgroundColor: `${project.color}15` }}
                 >
                   <FolderOpen className="h-8 w-8" style={{ color: project.color }} />
                 </div>
                 
                 <div className="flex-1">
                    <h1 className="text-2xl font-bold text-foreground mb-1">{project.name}</h1>
                    <p className="text-muted-foreground leading-relaxed max-w-2xl">
                        {project.description || "No description provided."}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
                            <Activity className="h-3.5 w-3.5" />
                            <span className="font-medium text-foreground">{project._count.activities}</span> entries
                        </div>
                        {project.activities[0] && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
                                <Clock className="h-3.5 w-3.5" />
                                Updated {formatDistanceToNow(project.activities[0].createdAt)} ago
                            </div>
                        )}
                    </div>
                 </div>
            </div>
        </div>

        {/* Activity Feed */}
        <div>
            <h2 className="text-lg font-semibold mb-4 px-1">Activity Timeline</h2>
            
            {project.activities.length === 0 ? (
                <Card className="bg-muted/30 border-dashed border-muted-foreground/30">
                    <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                        <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
                         <p className="text-muted-foreground font-medium">No activities yet</p>
                         <p className="text-xs text-muted-foreground/70 max-w-xs mt-1">
                            Start generic activities or assign logs to this project to see them here.
                         </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="relative border-l border-border/50 ml-6 space-y-8 pb-12">
                    {project.activities.map((activity, index) => {
                        const date = new Date(activity.createdAt);
                        const isToday = new Date().toDateString() === date.toDateString();
                        
                        return (
                            <div key={activity.id} className="relative pl-8 group">
                                {/* Dot */}
                                <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-border group-hover:bg-primary transition-colors ring-4 ring-background" />
                                
                                <div className="bg-card border border-border/50 hover:border-border rounded-lg p-4 transition-all hover:shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {date.toLocaleDateString("en-US", { 
                                                weekday: 'short', 
                                                month: 'short', 
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                            <span className="text-muted-foreground/50 mx-1">•</span>
                                            {date.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit' })}
                                        </div>
                                        {isToday && (
                                            <span className="bg-primary/10 text-primary text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm tracking-wide">
                                                New
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-foreground text-sm whitespace-pre-wrap leading-relaxed">
                                        {activity.content}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

      </div>
    </DashboardShell>
  );
}
