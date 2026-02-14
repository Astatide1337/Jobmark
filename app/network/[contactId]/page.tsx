import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getContactById, getInteractionsByContact } from "@/app/actions/network";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ContactDetailView } from "@/components/network/contact-detail-view";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { contactId } = await params;

  const [contact, interactions] = await Promise.all([
    getContactById(contactId),
    getInteractionsByContact(contactId),
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
      <div className="space-y-6">
        <Link
          href="/network"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Network
        </Link>
        <ContactDetailView contact={contact} interactions={interactions} />
      </div>
    </DashboardShell>
  );
}
