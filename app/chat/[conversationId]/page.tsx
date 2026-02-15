import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getConversation, getConversations } from "@/app/actions/chat";
import { getProjects } from "@/app/actions/projects";
import { getGoals } from "@/app/actions/goals";
import { getContacts } from "@/app/actions/network";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ConversationClient } from "./conversation-client";

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { conversationId } = await params;

  const [conversation, conversations, projects, goals, contacts] = await Promise.all([
    getConversation(conversationId),
    getConversations(),
    getProjects(),
    getGoals(),
    getContacts(),
  ]);

  if (!conversation) {
    notFound();
  }

  const activeProjects = projects.filter((p) => !p.archived);

  return (
    <DashboardShell
      header={
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          title={conversation.title}
        />
      }
      className="p-0 overflow-hidden"
      chatSidebarData={{
        conversations,
        activeConversationId: conversationId,
        projects: activeProjects.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
        })),
      }}
    >
      <div className="h-full min-h-0">
        <ConversationClient
          conversation={conversation}
          userName={session.user.name}
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
        />
      </div>
    </DashboardShell>
  );
}
