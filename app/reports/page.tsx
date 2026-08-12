/**
 * Reviews Workspace
 *
 * Why: The primary engine for generating performance summaries.
 * This page uses a tabbed interface to switch between the interactive
 * "Report Wizard" and the "Report History" view.
 */
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getMcpProviderKey, getMcpProviderName } from '@/lib/mcp/provider-identity';
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

  const [projects, reports, connections] = await Promise.all([
    getProjects('active'),
    getReports(),
    prisma.mcpConnection.findMany({
      where: { userId: session.user.id, revokedAt: null },
      include: {
        oauthClient: { select: { clientId: true, clientName: true, redirectUris: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // A user can have more than one connection record for the same client. The
  // wizard only needs one action per active provider, so dedupe by the trusted
  // provider identity rather than the user-supplied display name.
  const connectedMcpProviders = Array.from(
    new Map(
      connections.map(connection => {
        const identity = {
          ...connection.oauthClient,
          clientName: connection.oauthClient.clientName || connection.clientName,
        };
        const key = getMcpProviderKey(identity);
        return [key, { key, name: getMcpProviderName(identity) }];
      })
    ).values()
  );

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
            <ReportWizard projects={projects} connectedMcpProviders={connectedMcpProviders} />
          </TabsContent>

          <TabsContent value="history" className="flex-1">
            <ReportHistory initialReports={reports} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
