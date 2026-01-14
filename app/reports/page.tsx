import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjects } from "@/app/actions/projects";
import { getReports } from "@/app/actions/reports";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ReportWizard } from "@/components/reports/report-wizard";
import { ReportHistory } from "@/components/reports/report-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, History } from "lucide-react";

interface ReportsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await auth();
  const { tab } = await searchParams;

  if (!session?.user) {
    redirect("/login");
  }

  const projects = await getProjects();
  const reports = await getReports();

  const defaultTab = tab === "history" ? "history" : "new";

  return (
    <DashboardShell
      header={
        <DashboardHeader
          userName={session.user.name}
          userImage={session.user.image}
          title="AI Reports"
        />
      }
    >

      <div className="h-[calc(100vh-140px)] flex flex-col">
        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col space-y-8">
          <div className="flex justify-center shrink-0">
            <TabsList className="grid w-full max-w-lg grid-cols-2">
              <TabsTrigger value="new">
                <Sparkles className="mr-2 h-4 w-4" />
                New Report
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="mr-2 h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="new" className="flex-1 min-h-0">
            <ReportWizard projects={projects} />
          </TabsContent>
          
          <TabsContent value="history" className="flex-1 min-h-0">
            <ReportHistory initialReports={reports} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
