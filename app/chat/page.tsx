/**
 * AI Mentor Page (The Chat Hub)
 *
 * Why: This is the primary interface for users to interact with their
 * AI Career Mentor. It handles the server-side preparation of all
 * potential context sources.
 *
 * Performance: Uses `Promise.all` to fetch conversations, projects,
 * goals, contacts, and reports in parallel. This ensures the chat
 * interface has everything it needs to offer smart suggested prompts
 * immediately on load.
 */
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getConversations } from '@/app/actions/chat';
import { getProjects } from '@/app/actions/projects';
import { getGoals } from '@/app/actions/goals';
import { getContacts } from '@/app/actions/network';
import { getReports } from '@/app/actions/reports';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ChatInterface } from '@/components/chat/chat-interface';

export default async function ChatPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const userId = session.user.id;

  const [conversations, projects, goals, contacts, reports] = await Promise.all([
    getConversations(20, userId),
    getProjects('active', userId),
    getGoals(userId),
    getContacts(undefined, userId),
    getReports(userId),
  ]);

  const activeProjects = projects.filter(p => !p.archived);

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
      chatSidebarData={{
        conversations,
        projects: activeProjects.map(p => ({
          id: p.id,
          name: p.name,
          color: p.color,
        })),
      }}
    >
      <div className="flex flex-1 flex-col">
        <ChatInterface
          mode="general"
          userName={session.user.name}
          initialMessages={[]}
          projectId={null}
          goalId={null}
          contactId={null}
          reportIds={[]}
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
          showPrompts
        />
      </div>
    </DashboardShell>
  );
}
