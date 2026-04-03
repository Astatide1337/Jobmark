/**
 * AI Reports Workspace
 *
 * Why: The primary engine for generating performance summaries.
 * This page uses a tabbed interface to switch between the interactive
 * "Report Wizard" and the "Report History" view.
 */
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getProjects } from '@/app/actions/projects';
import { getReports } from '@/app/actions/reports';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ReportWizard } from './report-wizard';
import { ReportHistory } from '@/components/reports/report-history';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, History } from 'lucide-react';

interface ReportsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await auth();
  const { tab } = await searchParams;

  if (!session?.user?.id) {
    redirect('/');
  }

  const userId = session.user.id;

  const [projects, reports] = await Promise.all([
    getProjects('active', userId),
    getReports(userId),
  ]);

  const defaultTab = tab === 'history' ? 'history' : 'new';

  return (
    <DashboardShell
      header={
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          title="Reviews & Summaries"
        />
      }
    >
      <div className="flex flex-1 flex-col">
        <Tabs defaultValue={defaultTab} className="flex flex-1 flex-col space-y-8">
          <div className="flex shrink-0 justify-center">
            <TabsList className="grid w-full max-w-lg grid-cols-2">
              <TabsTrigger value="new">
                <Sparkles className="mr-2 h-4 w-4" />
                New Summary
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="mr-2 h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="new" className="flex-1">
            <ReportWizard projects={projects} />
          </TabsContent>

          <TabsContent value="history" className="flex-1">
            <ReportHistory initialReports={reports} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
