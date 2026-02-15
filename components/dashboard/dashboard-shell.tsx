"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { PageTransition } from "@/components/ui/page-transition";
import { cn } from "@/lib/utils";
import type { ConversationData } from "@/app/actions/chat";

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
  return (
    <div className="min-h-screen bg-background flex">
      {!hideSidebar && <Sidebar chatSidebarData={chatSidebarData} />}
      
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {header}
        
        <PageTransition>
          <div
            className={cn(
              "flex-1 min-h-0 p-6 lg:p-8 xl:p-10 overflow-auto",
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
