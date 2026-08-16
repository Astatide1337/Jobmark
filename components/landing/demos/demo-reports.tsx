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
      '## Review draft\nShipped the new landing page.\n\n### What changed\n- Built the new layout\n- Cut load time by 40%\n- Fixed the mobile layout\n\n### Next steps\n- Test the headline copy\n- Make the images look sharp on all screens',
    createdAt: DEMO_NOW,
  },
  {
    id: '2',
    title: 'Q1 Goals Review',
    content:
      '## Overview\nWe are 70% of the way to our Q1 goal: launch the app.\n\n### Progress\n- Sign-in: done\n- Database setup: done\n- App screens: in progress',
    createdAt: new Date(DEMO_NOW.getTime() - 86400000 * 2),
  },
];

export function DemoReports() {
  return (
    <DashboardFrame activePath="/reports">
      <div className="space-y-6">
        <div>
          <h2 className="mb-2 text-3xl font-bold tracking-tight">Review drafts</h2>
          <p className="text-muted-foreground">Start with the notes you already saved.</p>
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
