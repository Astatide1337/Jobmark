"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Pen, 
  BarChart3, 
  FolderOpen, 
  FileText, 
  Settings 
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: Pen, label: "Journal" },
  { href: "/projects", icon: FolderOpen, label: "Projects" },
  { href: "/reports", icon: FileText, label: "Reports" },
  { href: "/insights", icon: BarChart3, label: "Insights" },
];

const settingsItem = { href: "/dashboard/settings", icon: Settings, label: "Settings" };

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border/50 bg-sidebar">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <Pen className="h-4 w-4 text-primary" />
          </div>
          <span className="text-lg font-semibold text-foreground">Jobmark</span>
        </Link>
      </div>

      <nav className="flex-1 px-3">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={pathname === item.href}
          />
        ))}
      </nav>

      <div className="p-3 border-t border-border/50">
        <NavItem
          href={settingsItem.href}
          icon={settingsItem.icon}
          label={settingsItem.label}
          isActive={pathname === settingsItem.href}
        />
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-1",
        isActive 
          ? "text-sidebar-accent-foreground" 
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {/* Active background indicator with animation */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 bg-sidebar-accent rounded-lg"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      
      <Icon className="relative z-10 h-4 w-4" />
      <span className="relative z-10">
        {label}
      </span>
    </Link>
  );
}
