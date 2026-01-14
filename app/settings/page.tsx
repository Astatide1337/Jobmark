import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getUserSettings } from "@/app/actions/settings";
import { SettingsClient } from "@/components/settings/settings-client";
import { getGoals } from "@/app/actions/goals";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [settings, goals] = await Promise.all([
    getUserSettings(),
    getGoals(),
  ]);

  if (!settings) {
    redirect("/login");
  }

  return (
    <DashboardShell
      header={
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          title="Settings"
        />
      }
    >
      <SettingsClient settings={settings} goals={goals} />
    </DashboardShell>
  );
}
