/**
 * Networking & CRM Hub
 *
 * Why: Centralizes professional relationship management. This page
 * allows users to track contacts and see high-level networking stats
 * (e.g., follow-ups due).
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getContacts, getNetworkStats } from '@/app/actions/network';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ContactsList } from '@/components/network/contacts-list';

export default async function NetworkPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;

  const [contacts, stats] = await Promise.all([
    getContacts(undefined, userId),
    getNetworkStats(userId),
  ]);

  return (
    <DashboardShell
      header={
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          title="Network"
        />
      }
    >
      <div className="mx-auto w-full max-w-(--container-wide)">
        <ContactsList contacts={contacts} stats={stats} />
      </div>
    </DashboardShell>
  );
}
