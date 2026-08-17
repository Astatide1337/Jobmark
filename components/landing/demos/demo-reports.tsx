/**
 * Lightweight review-draft preview for the landing page.
 *
 * Why: Marketing content should show the shape of a feature without mounting
 * the authenticated report editor, its actions, or its animation tree.
 */
import { CheckCircle2, FileText } from 'lucide-react';
import { DashboardFrame } from './dashboard-frame';

const highlights = [
  'Shipped the new landing page',
  'Cut load time by 40%',
  'Fixed the mobile layout',
];

export function DemoReports() {
  return (
    <DashboardFrame activePath="/reports">
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Review drafts</h2>
          <p className="text-muted-foreground mt-1 text-sm">Start with the notes you saved.</p>
        </div>

        <article className="border-border/60 bg-card/60 rounded-2xl border p-4">
          <div className="text-muted-foreground mb-3 flex items-center gap-2 text-xs">
            <FileText className="text-primary h-4 w-4" />
            <span>Q4 review draft</span>
            <span className="text-success ml-auto">Ready</span>
          </div>
          <h3 className="text-sm font-semibold">What changed</h3>
          <ul className="mt-3 space-y-2">
            {highlights.map(highlight => (
              <li key={highlight} className="text-muted-foreground flex items-center gap-2 text-sm">
                <CheckCircle2 className="text-success h-4 w-4 shrink-0" />
                {highlight}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </DashboardFrame>
  );
}
