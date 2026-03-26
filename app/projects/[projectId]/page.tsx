import { auth } from '@/lib/auth';
import { getProjectDetails } from '@/app/actions/projects';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { redirect } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Clock, FolderOpen, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ProjectActivityTimeline } from './project-activity-timeline';

interface ProjectDetailsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const { projectId } = await params;
  const project = await getProjectDetails(projectId, 20, session.user.id);

  if (!project) {
    // Project not found or locked — redirect to projects list
    redirect('/projects');
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
      <div className="mx-auto w-full max-w-7xl space-y-8 px-6 py-8 lg:px-8">
        {/* Back navigation */}
        <Link
          href="/projects"
          className="text-muted-foreground hover:text-primary group inline-flex items-center gap-2 text-sm transition-all active:scale-95"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Projects
        </Link>

        {/* Header Card */}
        <div className="bg-card/40 border-border/40 rounded-2xl border p-6 shadow-sm backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-inner"
              style={{ backgroundColor: `${project.color}15` }}
            >
              <FolderOpen className="h-8 w-8" style={{ color: project.color }} />
            </div>

            <div className="flex-1">
              <h1 className="text-foreground mb-1 text-2xl font-bold">{project.name}</h1>
              <p className="text-muted-foreground max-w-2xl leading-relaxed">
                {project.description || 'No description provided.'}
              </p>

              <div className="text-muted-foreground mt-4 flex items-center gap-4 text-sm">
                <div className="bg-muted/50 flex items-center gap-1.5 rounded-md px-2 py-1">
                  <Activity className="h-3.5 w-3.5" />
                  <span className="text-foreground font-medium">
                    {project._count.activities}
                  </span>{' '}
                  entries
                </div>
                {project.activities[0] && (
                  <div className="bg-muted/50 flex items-center gap-1.5 rounded-md px-2 py-1">
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
          <h2 className="mb-4 px-1 text-lg font-semibold">Activity Timeline</h2>
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
