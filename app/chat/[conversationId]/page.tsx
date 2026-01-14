import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getConversation, getConversations, updateConversationContext } from "@/app/actions/chat";
import { getProjects } from "@/app/actions/projects";
import { getGoals } from "@/app/actions/goals";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
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

  const [conversation, conversations, projects, goals] = await Promise.all([
    getConversation(conversationId),
    getConversations(),
    getProjects(),
    getGoals(),
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
      className="p-0"
    >
      <div className="flex h-[calc(100vh-100px)]">
        {/* Sidebar - Desktop */}
        <div className="hidden lg:flex w-[340px] shrink-0 flex-col p-6 h-full">
          <ChatSidebar
            conversations={conversations}
            activeConversationId={conversationId}
            projects={activeProjects.map((p) => ({
              id: p.id,
              name: p.name,
              color: p.color,
            }))}
          />
        </div>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col min-w-0">
          <ConversationClient
            conversation={conversation}
            projects={activeProjects.map((p) => ({
              id: p.id,
              name: p.name,
              color: p.color,
            }))}
            goals={goals.map((g) => ({
              id: g.id,
              title: g.title,
            }))}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
