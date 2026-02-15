import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getConversations } from "@/app/actions/chat";
import { getProjects } from "@/app/actions/projects";
import { getGoals } from "@/app/actions/goals";
import { getContacts } from "@/app/actions/network";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ChatInterface } from "@/components/chat/chat-interface";

export default async function ChatPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const [conversations, projects, goals, contacts] = await Promise.all([
    getConversations(),
    getProjects(),
    getGoals(),
    getContacts(),
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
      <div className="flex-1 flex flex-col min-h-0 h-full">
        <ChatInterface
          mode="general"
          userName={session.user.name}
          initialMessages={[]}
          projectId={null}
          goalId={null}
          contactId={null}
          projects={activeProjects.map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color,
          }))}
          goals={goals.map((g) => ({
            id: g.id,
            title: g.title,
          }))}
          contacts={contacts.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            relationship: c.relationship ?? null,
            interactionsCount: c._count?.interactions ?? 0,
          }))}
          showPrompts
        />
      </div>
    </DashboardShell>
  );
}
