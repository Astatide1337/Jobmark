"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { PageTransition } from "@/components/ui/page-transition";
import { useUI } from "@/components/providers/ui-provider";
import { cn } from "@/lib/utils";
import type { ConversationData } from "@/app/actions/chat";

interface DashboardShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
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
  const { uiV2 } = useUI();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Inject mobile toggle into header if it's a valid React element
  const headerWithToggle = React.isValidElement(header)
    ? React.cloneElement(header as React.ReactElement<{ onMenuClick: () => void }>, {
        onMenuClick: () => setIsMobileOpen(true),
      })
    : header;

  return (
    <div className={cn(
      "bg-background flex w-full",
      uiV2 ? "min-h-screen" : "h-screen overflow-hidden"
    )}>
      {!hideSidebar && (
        <Sidebar 
          chatSidebarData={chatSidebarData} 
          isMobileOpen={isMobileOpen}
          onMobileClose={() => setIsMobileOpen(false)}
        />
      )}
      
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {headerWithToggle}
        
        <PageTransition className={cn(
          "flex-1 flex flex-col min-h-0",
          !uiV2 && "h-full"
        )}>
          <div
            className={cn(
              "flex-1 min-h-0 flex flex-col",
              uiV2 
                ? "overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent px-4 lg:px-8 py-6" 
                : "h-full overflow-hidden",
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
