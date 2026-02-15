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
      <div className="max-w-7xl mx-auto w-full px-6 lg:px-8 space-y-8">
        <Link
          href="/network"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-all active:scale-95 group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Network
        </Link>
        <ContactDetailView contact={contact} interactions={interactions} />
      </div>
    </DashboardShell>

  );
}
