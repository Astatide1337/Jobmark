/**
 * Interactive Reports Demo
 *
 * Why: Showcases the end-result of using jobmark. It visualizes the
 * professional formatting and evidence-based structure of generated briefs.
 *
 * Implementation: Reuses the production `ReportHistory` component with
 * pre-written examples that demonstrate the "Note-to-Narrative"
 * transformation.
 */
'use client';

import { DashboardFrame } from './dashboard-frame';
import { ReportHistory } from '@/components/reports/report-history';

// Keep demo content deterministic across SSR and hydration. Using `new Date()`
// here makes the rendered timestamp differ by a minute when the browser takes
// over, which triggers a hydration warning in the landing-page walkthrough.
const DEMO_NOW = new Date('2026-08-09T21:59:00.000Z');

const reports = [
  {
    id: '1',
    title: 'Weekly Engineering Update',
    content:
      '## Summary\nSuccessfully deployed the new landing page infrastructure.\n\n### Key Wins\n- Implemented Bento Grid layout\n- Improved load time by 40%\n- Fixed responsive issues on mobile\n\n### Next Steps\n- Conduct A/B testing on headline copy\n- Optimize images for retina displays',
    createdAt: DEMO_NOW,
  },
  {
    id: '2',
    title: 'Q1 Goals Review',
    content:
      '## Overview\nWe are currently 70% toward our Q1 target of launching the MVP.\n\n### Progress\n- Backend Auth: Complete\n- Database Schema: Finalized\n- Frontend UI: In Progress',
    createdAt: new Date(DEMO_NOW.getTime() - 86400000 * 2),
  },
];

export function DemoReports() {
  return (
    <DashboardFrame activePath="/reports">
      <div className="space-y-6">
        <div>
          <h2 className="mb-2 text-3xl font-bold tracking-tight">Review drafts</h2>
          <p className="text-muted-foreground">Start with the work you have already recorded.</p>
        </div>
        <ReportHistory
          initialReports={reports}
          onUpdate={async () => {}}
          onDelete={async () => {}}
          displayTimeZone="UTC"
        />
      </div>
    </DashboardFrame>
  );
}
