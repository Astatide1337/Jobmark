"use client";

import { DashboardFrame } from "./dashboard-frame";
import { ReportHistory } from "@/components/reports/report-history";

const reports = [
  {
    id: "1",
    title: "Weekly Engineering Update",
    content: "## Summary\nSuccessfully deployed the new landing page infrastructure.\n\n### Key Wins\n- Implemented Bento Grid layout\n- Improved load time by 40%\n- Fixed responsive issues on mobile\n\n### Next Steps\n- Conduct A/B testing on headline copy\n- Optimize images for retina displays",
    createdAt: new Date(),
  },
  {
    id: "2",
    title: "Q1 Goals Review",
    content: "## Overview\nWe are currently 70% toward our Q1 target of launching the MVP.\n\n### Progress\n- Backend Auth: Complete\n- Database Schema: Finalized\n- Frontend UI: In Progress",
    createdAt: new Date(Date.now() - 86400000 * 2),
  }
];

export function DemoReports() {
  return (
    <DashboardFrame activePath="/reports">
       <div className="space-y-6">
        <div>
           <h2 className="text-3xl font-bold tracking-tight mb-2">Reports</h2>
           <p className="text-muted-foreground">Generate summaries instantly.</p>
        </div>
        <ReportHistory 
            initialReports={reports} 
            onUpdate={async () => { await new Promise(resolve => setTimeout(resolve, 1000)); }}
            onDelete={async () => { await new Promise(resolve => setTimeout(resolve, 500)); }}
        />
      </div>
    </DashboardFrame>
  );
}
