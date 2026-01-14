import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getConversations } from "@/app/actions/chat";
import { getProjects } from "@/app/actions/projects";
import { getGoals } from "@/app/actions/goals";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
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
      className="p-0"
    >
      <div className="flex h-[calc(100vh-100px)]">
        {/* Sidebar - Desktop */}
        <div className="hidden lg:flex w-[340px] shrink-0 flex-col p-6 h-full">
          <ChatSidebar
            conversations={conversations}
            projects={activeProjects.map((p) => ({
              id: p.id,
              name: p.name,
              color: p.color,
            }))}
          />
        </div>

        {/* Main Content - Suggested Prompts */}
        <div className="flex-1 overflow-y-auto p-8">
          <SuggestedPrompts
            projects={activeProjects.map((p) => ({
              id: p.id,
              name: p.name,
              color: p.color,
            }))}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
