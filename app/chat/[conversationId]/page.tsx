import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getConversation, getConversations } from '@/app/actions/chat';
import { getProjects } from '@/app/actions/projects';
import { getGoals } from '@/app/actions/goals';
import { getContacts } from '@/app/actions/network';
import { getReports } from '@/app/actions/reports';
import { getVaultProjects } from '@/app/actions/project-lock';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ConversationClient } from './conversation-client';

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  const { conversationId } = await params;

  const [conversation, conversations, projects, goals, contacts, reports, vaultProjects] = await Promise.all([
    getConversation(conversationId),
    getConversations(),
    getProjects(),
    getGoals(),
    getContacts(),
    getReports(),
    getVaultProjects(), // Returns [] when vault is locked; included when unlocked so they appear in context picker
  ]);

  if (!conversation) {
    notFound();
  }

  // Merge regular active projects with vault projects (vault projects only present when unlocked)
  const activeProjects = [...projects.filter(p => !p.archived), ...vaultProjects];

  const chatSidebarData = {
    conversations,
    activeConversationId: conversation.id,
    projects: activeProjects.map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
    })),
  };

  return (
    <DashboardShell
      chatSidebarData={chatSidebarData}
      header={
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          title={conversation.title}
        />
      }
      className="p-0"
    >
      <div className="flex flex-1 flex-col">
        <ConversationClient
          conversation={conversation}
          userName={session.user.name}
          projects={activeProjects.map(p => ({
            id: p.id,
            name: p.name,
            color: p.color,
          }))}
          goals={goals.map(g => ({
            id: g.id,
            title: g.title,
          }))}
          contacts={contacts.map(c => ({
            id: c.id,
            fullName: c.fullName,
            relationship: c.relationship ?? null,
            interactionsCount: c._count?.interactions ?? 0,
          }))}
          reports={reports.map(r => ({
            id: r.id,
            title: r.title,
            createdAt: r.createdAt,
          }))}
        />
      </div>
    </DashboardShell>
  );
}
