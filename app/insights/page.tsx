import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getInsightsData } from "@/app/actions/insights";
import { InsightsClient } from "@/components/insights/insights-client";

export default async function InsightsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const data = await getInsightsData();

  return (
    <DashboardShell
      header={
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          title="Insights"
        />
      }
    >
      <InsightsClient initialData={data} />
    </DashboardShell>
  );
}
