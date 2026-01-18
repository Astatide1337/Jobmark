import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjects } from "@/app/actions/projects";
import { ProjectList } from "@/components/projects/project-list";
import { ProjectDialog } from "@/components/projects/project-dialog";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

interface ProjectsPageProps {
  searchParams: Promise<{ filter?: string; new?: string }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user) {
    redirect("/login");
  }

  const currentFilter = params.filter === "archived" ? "archived" : "active";
  const openCreate = params.new === "true";
  const projects = await getProjects(currentFilter);

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
    <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Organize your activities by project for focused reporting.
          </p>
        </div>

        <ProjectList projects={projects} initialFilter={currentFilter} openCreate={openCreate} />
      </div>
    </DashboardShell>
  );
}

