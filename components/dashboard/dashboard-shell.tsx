"use client";

import { ReactNode, useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { PageTransition } from "@/components/ui/page-transition";
import { cn } from "@/lib/utils";
import type { ConversationData } from "@/app/actions/chat";
import React from "react";

interface DashboardShellProps {
  children: ReactNode;
  header?: ReactNode;
  className?: string; // Allow custom classes for the main content area
  hideSidebar?: boolean;
  chatSidebarData?: {
    conversations: ConversationData[];
    activeConversationId?: string;
    projects: Array<{ id: string; name: string; color: string }>;
  };
}

export function DashboardShell({
  children,
  header,
  className,
  hideSidebar = false,
  chatSidebarData,
}: DashboardShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Inject mobile toggle into header if it's a valid React element
  const headerWithToggle = React.isValidElement(header)
    ? React.cloneElement(header as React.ReactElement<{ onMenuClick: () => void }>, {
        onMenuClick: () => setIsMobileOpen(true),
      })
    : header;

  return (
    <div className="h-screen overflow-hidden bg-background flex">
      {!hideSidebar && (
        <Sidebar 
          chatSidebarData={chatSidebarData} 
          isMobileOpen={isMobileOpen}
          onMobileClose={() => setIsMobileOpen(false)}
        />
      )}
      
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {headerWithToggle}
        
        <PageTransition className="flex-1 flex flex-col min-h-0 h-full">
          <div
            className={cn(
              "flex-1 min-h-0 flex flex-col h-full overflow-hidden",
              className
            )}
          >
            {children}
          </div>
        </PageTransition>
      </main>
    </div>
  );
}

