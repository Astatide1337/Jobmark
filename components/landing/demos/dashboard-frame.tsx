"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { cn } from "@/lib/utils";

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
  activePath = "/dashboard",
  compact = false,
  className,
  contentClassName
}: DashboardFrameProps) {
  return (
    <div className={cn(
      "flex w-full bg-background text-foreground rounded-xl border border-border/50 shadow-2xl overflow-hidden",
      compact ? "h-[480px] min-w-[750px]" : "h-full",
      className
    )}>
      <Sidebar mode="demo" activePath={activePath} />
      
      <div className="flex-1 flex flex-col min-w-0 bg-background/50">
        <DashboardHeader 
          userName="Demo User" 
          title={activePath === "/dashboard" ? undefined : activePath.replace("/", "").charAt(0).toUpperCase() + activePath.slice(2)}
          showDate={activePath === "/dashboard"}
        />
        
        <div className={cn("flex-1 p-6 lg:p-8 overflow-hidden", contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}
