/**
 * Lightweight insights preview for the landing page.
 *
 * Why: The landing page needs one clear example, not a second Recharts and
 * analytics application running below the fold.
 */
import { BarChart3, CheckCircle2, FolderKanban, TrendingUp } from 'lucide-react';
import { DashboardFrame } from './dashboard-frame';

const projects = [
  { name: 'Website redesign', count: 18, width: '78%' },
  { name: 'Mobile app', count: 11, width: '54%' },
  { name: 'Q1 planning', count: 7, width: '36%' },
];

export function DemoInsights() {
  return (
    <DashboardFrame activePath="/insights">
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Insights</h2>
          <p className="text-muted-foreground mt-1 text-sm">See where your notes are going.</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            ['Notes', '42'],
            ['Days', '18'],
            ['Projects', '3'],
          ].map(([label, value]) => (
            <div key={label} className="border-border/50 bg-card/60 rounded-xl border p-3">
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">{label}</p>
              <p className="mt-1 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div className="border-border/60 bg-card/60 rounded-2xl border p-4">
          <div className="text-muted-foreground mb-4 flex items-center gap-2 text-xs">
            <BarChart3 className="text-primary h-4 w-4" />
            <span>Notes by project</span>
            <TrendingUp className="text-success ml-auto h-4 w-4" />
          </div>
          <div className="space-y-3">
            {projects.map(project => (
              <div key={project.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <FolderKanban className="text-muted-foreground h-3.5 w-3.5" />
                    {project.name}
                  </span>
                  <span className="text-muted-foreground">{project.count}</span>
                </div>
                <div className="bg-muted h-1.5 rounded-full">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: project.width }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <CheckCircle2 className="text-success h-4 w-4" />
          Enough detail for a useful review.
        </p>
      </div>
    </DashboardFrame>
  );
}
