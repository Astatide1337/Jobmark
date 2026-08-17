import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Shared shell for OAuth consent and error pages.
 *
 * Why: These pages are opened by external assistants, so they need a quiet,
 * recognizable surface that still belongs to the main Jobmark product.
 */
export function McpAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
      <div className="w-full max-w-lg">{children}</div>
    </main>
  );
}

export function McpAuthCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        'border-border/60 bg-card/60 w-full overflow-hidden rounded-3xl shadow-sm',
        className
      )}
    >
      {children}
    </Card>
  );
}
