import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Coffee,
  FileText,
  Folder,
  Link2,
  Pencil,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import { JobmarkMark } from '@/components/brand/jobmark-mark';

const navigation = [
  { label: 'Capture', icon: Pencil, active: true },
  { label: 'Projects', icon: Folder },
  { label: 'Reviews', icon: FileText },
  { label: 'Insights', icon: BarChart3 },
  { label: 'Focus', icon: Coffee },
  { label: 'Network', icon: Users },
  { label: 'Connect AI', icon: Link2 },
  { label: 'Guides', icon: BookOpen },
];

/** A static marketing representation, intentionally separate from the app UI. */
export function DashboardPreview() {
  return (
    <div className="border-border/50 bg-card/90 relative overflow-hidden rounded-2xl border shadow-2xl shadow-black/25">
      <div className="grid min-h-[480px] grid-cols-[180px_1fr] sm:grid-cols-[230px_1fr]">
        <aside className="border-border/50 bg-sidebar/70 flex flex-col border-r p-4 sm:p-5">
          <div className="mb-8 flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl">
              <JobmarkMark className="h-5 w-5" sizes="20px" />
            </div>
            <span className="text-foreground font-serif text-lg font-semibold">Jobmark</span>
          </div>

          <nav aria-label="Preview navigation" className="space-y-1">
            {navigation.map(({ label, icon: Icon, active }) => (
              <div
                key={label}
                className={
                  active
                    ? 'bg-sidebar-accent text-foreground flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium'
                    : 'text-sidebar-foreground/70 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm'
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </div>
            ))}
          </nav>

          <div className="border-sidebar-border/60 mt-auto border-t pt-4">
            <div className="text-sidebar-foreground/70 flex items-center gap-3 px-3 py-2.5 text-sm">
              <Settings className="h-4 w-4" />
              Settings
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="border-border/50 flex items-center justify-between border-b px-5 py-4 sm:px-7">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4" />
              Monday, August 17
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
                DU
              </span>
              <span className="hidden sm:inline">Demo User</span>
            </div>
          </header>

          <main className="space-y-6 p-5 sm:p-7">
            <div>
              <h2 className="text-foreground text-2xl font-semibold sm:text-3xl">Good morning.</h2>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Write down what you did while it is fresh.
              </p>
            </div>

            <section className="border-border/60 bg-background/40 rounded-2xl border p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  New note
                </p>
                <span className="text-primary text-xs">Today</span>
              </div>
              <p className="text-foreground text-sm leading-relaxed sm:text-base">
                Finished the quarterly review and walked the team through the key decisions.
              </p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="bg-primary/15 text-primary rounded-full px-3 py-1 text-xs font-medium">
                  Q4 Planning
                </span>
                <span className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium">
                  Save note
                </span>
              </div>
            </section>

            <div className="grid grid-cols-3 gap-3">
              {[
                ['Notes', '42'],
                ['Active days', '18'],
                ['Projects', '5'],
              ].map(([label, value]) => (
                <div key={label} className="border-border/50 bg-card/60 rounded-xl border p-4">
                  <p className="text-muted-foreground text-xs uppercase">{label}</p>
                  <p className="text-foreground mt-2 text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <div className="border-border/40 bg-primary/5 flex items-center gap-3 rounded-xl border p-4">
              <Sparkles className="text-primary h-5 w-5 shrink-0" />
              <p className="text-muted-foreground text-sm">
                Your notes stay in one place, ready when you need them.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
