/**
 * Demo Dashboard Frame
 *
 * Why: This is a high-fidelity wrapper that mimics the real application
 * layout. It allows us to showcase the product's UX on the landing page
 * without requiring the user to be logged in.
 *
 * Pattern: Reuses the real `Sidebar` and `DashboardHeader` components,
 * but passes a `mode="demo"` flag to ensure no real data is fetched or
 * modified.
 */
'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { cn } from '@/lib/utils';

interface DashboardFrameProps {
  children: ReactNode;
  title?: string;
  description?: string;
  activePath?: string;
  compact?: boolean;
  className?: string;
  contentClassName?: string;
}

/**
 * Wrapper component that provides the main dashboard layout.
 * Used in demos to mimic the real dashboard appearance.
 */
export function DashboardFrame({
  children,
  title,
  description,
  activePath = '/dashboard',
  compact = false,
  className,
  contentClassName,
}: DashboardFrameProps) {
  return (
    <div
      className={cn(
        'bg-background text-foreground border-border/50 flex w-full overflow-hidden rounded-xl border shadow-2xl',
        compact ? 'h-[480px] min-w-[750px]' : 'h-full',
        className
      )}
    >
      <Sidebar mode="demo" activePath={activePath} />

      <div className="bg-background/50 flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          userName="Demo User"
          title={
            activePath === '/dashboard'
              ? undefined
              : activePath.replace('/', '').charAt(0).toUpperCase() + activePath.slice(2)
          }
          showDate={activePath === '/dashboard'}
        />

        <div className={cn('flex-1 overflow-hidden p-6 lg:p-8', contentClassName)}>{children}</div>
      </div>
    </div>
  );
}
