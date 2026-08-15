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

import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { cn } from '@/lib/utils';

interface DashboardFrameProps {
  children: ReactNode | ((activePath: string) => ReactNode);
  title?: string;
  description?: string;
  activePath?: string;
  compact?: boolean;
  className?: string;
  contentClassName?: string;
}

function titleForPath(path: string): string | undefined {
  if (path === '/dashboard') return undefined;
  const titles: Record<string, string> = {
    '/projects': 'Projects',
    '/reports': 'Reviews',
    '/insights': 'Insights',
    '/focus': 'Focus',
    '/network': 'Network',
    '/chat': 'MCP Connector',
    '/articles': 'Articles',
    '/settings': 'Settings',
  };
  return titles[path] ?? 'Jobmark';
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
  const [currentPath, setCurrentPath] = useState(activePath);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setCurrentPath(activePath);
  }, [activePath]);

  return (
    <div
      className={cn(
        'bg-background text-foreground border-border/50 flex w-full overflow-hidden rounded-xl border shadow-2xl',
        compact ? 'h-[520px] min-h-[520px] min-w-0' : 'h-full min-h-0',
        className
      )}
    >
      <Sidebar
        mode="demo"
        activePath={currentPath}
        onDemoNavigate={setCurrentPath}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      <div className="bg-background/50 flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          userName="Demo User"
          title={titleForPath(currentPath)}
          showDate={currentPath === '/dashboard'}
          demoMode
          onMenuClick={() => setIsMobileOpen(true)}
        />

        <div
          className={cn(
            'scrollbar-none min-h-0 w-full flex-1 overflow-y-auto p-5 lg:p-6',
            contentClassName
          )}
        >
          {typeof children === 'function' ? children(currentPath) : children}
        </div>
      </div>
    </div>
  );
}
