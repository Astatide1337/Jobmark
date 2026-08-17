/**
 * Dashboard Shell (Root Layout Wrapper)
 *
 * Why: This is the primary structural component for the entire app. It
 * coordinates the Sidebar, Header, and Main content area.
 *
 * Responsibilities:
 * - Mobile Navigation: Manages the `isMobileOpen` state for the slide-over sidebar.
 * - App tooling: Mounts authenticated-only tools such as the command palette.
 */
'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { cn } from '@/lib/utils';
import { CommandPalette } from '@/components/ui/command-palette';
import { Toaster } from '@/components/ui/sonner';

interface DashboardShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  hideSidebar?: boolean;
}

export function DashboardShell({
  children,
  header,
  className,
  hideSidebar = false,
}: DashboardShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Inject mobile toggle into header if it's a valid React element
  const headerWithToggle = React.isValidElement(header)
    ? React.cloneElement(header as React.ReactElement<{ onMenuClick: () => void }>, {
        onMenuClick: () => setIsMobileOpen(true),
      })
    : header;

  return (
    <div className={cn('bg-background flex min-h-screen w-full')}>
      {!hideSidebar && (
        <Sidebar isMobileOpen={isMobileOpen} onMobileClose={() => setIsMobileOpen(false)} />
      )}

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <CommandPalette />
        <Toaster position="bottom-right" richColors />
        {headerWithToggle}

        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col',
            'scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent overflow-y-auto px-4 py-6 lg:px-8',
            className
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
