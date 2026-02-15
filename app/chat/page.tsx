import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getConversations } from "@/app/actions/chat";
import { getProjects } from "@/app/actions/projects";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SuggestedPrompts } from "@/components/chat/suggested-prompts";

export default async function ChatPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [conversations, projects] = await Promise.all([
    getConversations(),
    getProjects(),
  ]);

  const activeProjects = projects.filter((p) => !p.archived);

  return (
    <DashboardShell
      header={
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          title="AI Mentor"
        />
      }
      className="p-0 overflow-hidden"
      chatSidebarData={{
        conversations,
        projects: activeProjects.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
        })),
      }}
    >
      <div className="h-full overflow-y-auto p-8" data-lenis-prevent>
        <SuggestedPrompts
          userName={session.user.name}
          projects={activeProjects.map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color,
          }))}
        />
      </div>
    </DashboardShell>
  );
}
