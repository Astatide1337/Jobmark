/**
 * Projects Hub Page
 *
 * Why: Allows users to manage their workstreams. This page supports
 * filtering between "Active" and "Archived" projects to keep the
 * interface decluttered.
 */
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getProjects } from '@/app/actions/projects';
import { getVaultStatus, getVaultProjects } from '@/app/actions/project-lock';
import { ProjectList } from '@/components/projects/project-list';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

interface ProjectsPageProps {
  searchParams: Promise<{ filter?: string; new?: string }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect('/');
  }

  let currentFilter: 'active' | 'archived' | 'locked' = 'active';
  if (params.filter === 'archived') currentFilter = 'archived';
  else if (params.filter === 'locked') currentFilter = 'locked';
  const openCreate = params.new === 'true';

  // Fetch projects and vault state in parallel
  const [projects, vaultStatus, lockedProjects] = await Promise.all([
    currentFilter !== 'locked'
      ? getProjects(currentFilter as 'active' | 'archived')
      : Promise.resolve([]),
    getVaultStatus(),
    getVaultProjects(),
  ]);

  return (
    <DashboardShell
      header={
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          title="Projects"
        />
      }
    >
      <div className="mx-auto w-full max-w-(--container-wide)">
        <ProjectList
          projects={projects}
          initialFilter={currentFilter}
          openCreate={openCreate}
          vaultHasPassword={vaultStatus.hasPassword}
          vaultIsUnlocked={vaultStatus.isUnlocked}
          lockedProjects={lockedProjects}
        />
      </div>
    </DashboardShell>
  );
}
