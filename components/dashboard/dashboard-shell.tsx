"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { PageTransition } from "@/components/ui/page-transition";

interface DashboardShellProps {
  children: ReactNode;
  header?: ReactNode;
}

export function DashboardShell({ children, header }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {header}
        
        <PageTransition>
          <div className="flex-1 p-6 lg:p-8 xl:p-10 overflow-auto">
            {children}
          </div>
        </PageTransition>
      </main>
    </div>
  );
}
