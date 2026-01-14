import { auth } from "@/lib/auth";
import { getProjectDetails } from "@/app/actions/projects";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { notFound, redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Activity, Clock, FolderOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProjectActivityTimeline } from "@/components/projects/project-activity-timeline";

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
            <ProjectActivityTimeline
              projectId={projectId}
              initialActivities={project.activities}
              totalCount={project._count.activities}
            />
        </div>

      </div>
    </DashboardShell>
  );
}

