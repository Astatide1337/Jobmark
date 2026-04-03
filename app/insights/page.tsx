/**
 * Insights & Analytics Page
 *
 * Why: Provides deep visualization into a user's productivity habits.
 * It hosts the contribution heatmap and project distribution charts.
 *
 * Performance:
 * The `getInsightsData` action performs the heavy lifting of date-grouping
 * and grid calculation server-side, ensuring this page renders
 * instantly without client-side lag.
 */
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { getInsightsData } from '@/app/actions/insights';
import { InsightsClient } from './insights-client';

export default async function InsightsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/');
  }

  const data = await getInsightsData(session.user.id);

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
      <div className="mx-auto w-full max-w-(--container-wide)">
        <InsightsClient initialData={data} />
      </div>
    </DashboardShell>
  );
}
