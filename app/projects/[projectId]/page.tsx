import { auth } from '@/lib/auth';
import { getProjectDetails } from '@/app/actions/projects';
import { getUserSettings } from '@/app/actions/settings';
import { DEFAULT_TIME_ZONE, getCalendarDate, isValidTimeZone } from '@/lib/date-semantics';
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
    redirect('/');
  }

  const { projectId } = await params;
  const [project, settings] = await Promise.all([
    getProjectDetails(projectId, 20),
    getUserSettings(),
  ]);

  if (!project) {
    // Project not found or locked — redirect to projects list
    redirect('/projects');
  }

  const timeZone =
    settings?.timeZone && isValidTimeZone(settings.timeZone)
      ? settings.timeZone
      : DEFAULT_TIME_ZONE;
  const today = getCalendarDate(new Date(), timeZone);

  return (
    <DashboardShell
      header={
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          title="Project"
        />
      }
    >
      <div className="mx-auto w-full max-w-7xl space-y-8 py-2">
        {/* Back navigation */}
        <Link
          href="/projects"
          className="text-muted-foreground hover:text-primary group inline-flex items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to projects
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
                {project.description || 'No description added.'}
              </p>

              <div className="text-muted-foreground mt-4 flex items-center gap-4 text-sm">
                <div className="bg-muted/50 flex items-center gap-1.5 rounded-md px-2 py-1">
                  <Activity className="h-3.5 w-3.5" />
                  <span className="text-foreground font-medium">
                    {project._count.activities}
                  </span>{' '}
                  {project._count.activities === 1 ? 'note' : 'notes'}
                </div>
                {project.activities[0] && (
                  <div className="bg-muted/50 flex items-center gap-1.5 rounded-md px-2 py-1">
                    <Clock className="h-3.5 w-3.5" />
                    Last note {formatDistanceToNow(project.activities[0].createdAt)} ago
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <h2 className="mb-4 px-1 text-lg font-semibold">Notes in this project</h2>
          <ProjectActivityTimeline
            projectId={projectId}
            initialActivities={project.activities}
            totalCount={project._count.activities}
            timeZone={timeZone}
            today={today}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
