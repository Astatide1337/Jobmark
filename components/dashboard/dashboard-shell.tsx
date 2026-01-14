"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { PageTransition } from "@/components/ui/page-transition";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: ReactNode;
  header?: ReactNode;
  className?: string; // Allow custom classes for the main content area
}

export function DashboardShell({ children, header, className }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        {header}
        
        <PageTransition>
          <div className={cn("flex-1 p-6 lg:p-8 xl:p-10 overflow-auto", className)}>
            {children}
          </div>
        </PageTransition>
      </main>
    </div>
  );
}
