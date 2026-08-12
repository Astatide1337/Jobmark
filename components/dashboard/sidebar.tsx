'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Pen,
  BarChart3,
  FolderOpen,
  FileText,
  Settings,
  Coffee,
  Users,
  Newspaper,
  Link as LinkIcon,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', icon: Pen, label: 'Capture', demoId: 'journal' },
  { href: '/projects', icon: FolderOpen, label: 'Projects', demoId: 'feature-projects' },
  { href: '/reports', icon: FileText, label: 'Reviews', demoId: 'feature-reports' },
  { href: '/insights', icon: BarChart3, label: 'Insights', demoId: 'feature-insights' },
  { href: '/focus', icon: Coffee, label: 'Focus', demoId: 'feature-focus' },
  { href: '/network', icon: Users, label: 'Network', demoId: 'feature-network' },
  { href: '/chat', icon: LinkIcon, label: 'MCP Connector', demoId: 'feature-mentor' },
  { href: '/articles', icon: Newspaper, label: 'Articles', demoId: 'feature-articles' },
];

const settingsItem = { href: '/settings', icon: Settings, label: 'Settings', demoId: 'settings' };

interface SidebarProps {
  mode?: 'app' | 'demo';
  activePath?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  mode = 'app',
  activePath = '/',
  isMobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const currentPath = mode === 'demo' ? activePath : pathname;

  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onMobileClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onMobileClose]);

  const handleDemoClick = (id: string) => {
    if (mode === 'demo') {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <>
      {isMobileOpen && (
        <div
          role="presentation"
          aria-hidden="true"
          className="bg-background/80 fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        aria-label="Main navigation"
        className={cn(
          'border-border/50 bg-sidebar fixed inset-y-0 left-0 z-50 w-72 flex-col border-r transition-transform duration-300 lg:static lg:flex lg:w-64 lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          mode === 'app' ? 'lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto' : 'h-full'
        )}
      >
        <div className="relative p-6">
          {isMobileOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 lg:hidden"
              onClick={onMobileClose}
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
          {mode === 'app' ? (
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="bg-primary/20 flex h-9 w-9 items-center justify-center rounded-xl">
                <Pen className="text-primary h-4 w-4" />
              </div>
              <span className="text-foreground text-lg font-semibold">Jobmark</span>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 flex h-9 w-9 items-center justify-center rounded-xl">
                <Pen className="text-primary h-4 w-4" />
              </div>
              <span className="text-foreground text-lg font-semibold">Jobmark</span>
            </div>
          )}
        </div>

        <nav className="min-h-0 flex-1 px-3">
          {navItems.map(item => (
            <NavItem
              key={item.href}
              mode={mode}
              href={item.href}
              demoId={item.demoId}
              icon={item.icon}
              label={item.label}
              isActive={
                mode === 'app'
                  ? currentPath === item.href || currentPath?.startsWith(item.href + '/')
                  : currentPath === item.href
              }
              onClick={
                mode === 'demo' ? () => handleDemoClick(item.demoId) : () => onMobileClose?.()
              }
            />
          ))}
        </nav>
        <div className="border-border/50 border-t p-3">
          <NavItem
            mode={mode}
            href={settingsItem.href}
            demoId={settingsItem.demoId}
            icon={settingsItem.icon}
            label={settingsItem.label}
            isActive={currentPath === settingsItem.href}
            onClick={mode === 'demo' ? () => {} : () => onMobileClose?.()}
          />
        </div>
      </aside>
    </>
  );
}

function NavItem({
  mode = 'app',
  href,
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  mode?: 'app' | 'demo';
  href: string;
  demoId: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      {isActive && (
        <motion.div
          layoutId={mode === 'demo' ? 'demo-sidebar-active' : 'sidebar-active'}
          className="bg-sidebar-accent absolute inset-0 rounded-xl shadow-sm"
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}

      <Icon className="group-hover:text-primary relative z-10 h-4 w-4 transition-colors" />
      <span className="group-hover:text-primary relative z-10 transition-colors">{label}</span>
    </>
  );

  if (mode === 'demo') {
    return (
      <Button
        variant={isActive ? 'default' : 'ghost'}
        className={cn(
          'relative z-10 w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' : ''
        )}
        onClick={onClick}
      >
        {content}
      </Button>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group relative z-10 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
      )}
    >
      {content}
    </Link>
  );
}
