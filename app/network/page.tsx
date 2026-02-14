import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getContacts, getNetworkStats } from "@/app/actions/network";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ContactsList } from "@/components/network/contacts-list";

export default async function NetworkPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [contacts, stats] = await Promise.all([
    getContacts(),
    getNetworkStats(),
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
      <ContactsList contacts={contacts} stats={stats} />
    </DashboardShell>
  );
}
