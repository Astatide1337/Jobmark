import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getContactById, getInteractionsByContact } from '@/app/actions/network';
import { getOutreachDraftsByContact } from '@/app/actions/network-ai';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ContactDetailView } from '@/components/network/contact-detail-view';

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const { contactId } = await params;
  const userId = session.user.id;

  const [contact, interactions, initialDrafts] = await Promise.all([
    getContactById(contactId, userId),
    getInteractionsByContact(contactId, 20, userId),
    getOutreachDraftsByContact(contactId, userId),
  ]);

  if (!contact) notFound();

  return (
    <DashboardShell
      header={
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          title={contact.fullName}
        />
      }
    >
      <div className="mx-auto w-full max-w-7xl space-y-8 px-6 lg:px-8">
        <Link
          href="/network"
          className="text-muted-foreground hover:text-primary group inline-flex items-center gap-2 text-sm transition-all active:scale-95"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Network
        </Link>
        <ContactDetailView
          contact={contact}
          interactions={interactions}
          initialDrafts={initialDrafts}
        />
      </div>
    </DashboardShell>
  );
}
