'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
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
import { JobmarkMark } from '@/components/brand/jobmark-mark';

const navItems = [
  { href: '/dashboard', icon: Pen, label: 'Capture', demoId: 'journal' },
  { href: '/projects', icon: FolderOpen, label: 'Projects', demoId: 'feature-projects' },
  { href: '/reports', icon: FileText, label: 'Reviews', demoId: 'feature-reports' },
  { href: '/insights', icon: BarChart3, label: 'Insights', demoId: 'feature-insights' },
  { href: '/focus', icon: Coffee, label: 'Focus', demoId: 'feature-focus' },
  { href: '/network', icon: Users, label: 'Network', demoId: 'feature-network' },
  {
    href: '/settings/connections',
    icon: LinkIcon,
    label: 'Connect AI',
    demoId: 'feature-mentor',
  },
  { href: '/articles', icon: Newspaper, label: 'Guides', demoId: 'feature-articles' },
];

const settingsItem = { href: '/settings', icon: Settings, label: 'Settings', demoId: 'settings' };

interface SidebarProps {
  mode?: 'app' | 'demo';
  activePath?: string;
  onDemoNavigate?: (href: string) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  mode = 'app',
  activePath = '/',
  onDemoNavigate,
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

  const handleDemoClick = (href: string) => {
    if (mode === 'demo') {
      onDemoNavigate?.(href);
      onMobileClose?.();
    }
  };

  return (
    <>
      {isMobileOpen && (
        <div
          role="presentation"
          aria-hidden="true"
          className={cn(
            'bg-background/80 fixed inset-0 z-40 backdrop-blur-sm',
            mode === 'demo' ? 'sm:hidden' : 'lg:hidden'
          )}
          onClick={onMobileClose}
        />
      )}

      <aside
        aria-label="Main navigation"
        className={cn(
          'border-border/50 bg-sidebar fixed inset-y-0 left-0 z-50 w-72 flex-col border-r transition-transform duration-300 lg:static lg:flex lg:w-64 lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          mode === 'app'
            ? 'lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto'
            : 'sm:static sm:flex sm:h-full sm:w-64 sm:translate-x-0'
        )}
      >
        <div className={cn('relative', mode === 'demo' ? 'p-4' : 'p-6')}>
          {isMobileOpen && (
            <Button
              variant="ghost"
              size="icon"
              className={cn('absolute top-4 right-4', mode === 'demo' ? 'sm:hidden' : 'lg:hidden')}
              onClick={onMobileClose}
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
          {mode === 'app' ? (
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="bg-primary flex h-9 w-9 items-center justify-center rounded-xl">
                <JobmarkMark className="h-5 w-5" sizes="20px" />
              </div>
              <span className="text-foreground text-lg font-semibold">Jobmark</span>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <div className="bg-primary flex h-9 w-9 items-center justify-center rounded-xl">
                <JobmarkMark className="h-5 w-5" sizes="20px" />
              </div>
              <span className="text-foreground text-lg font-semibold">Jobmark</span>
            </div>
          )}
        </div>

        <nav
          className={cn(
            'scrollbar-none min-h-0 flex-1 overflow-y-auto px-3',
            mode === 'demo' && 'px-2'
          )}
        >
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
              onClick={mode === 'demo' ? () => handleDemoClick(item.href) : () => onMobileClose?.()}
            />
          ))}
        </nav>
        <div className={cn('border-border/50 shrink-0 border-t p-3', mode === 'demo' && 'p-2')}>
          <NavItem
            mode={mode}
            href={settingsItem.href}
            demoId={settingsItem.demoId}
            icon={settingsItem.icon}
            label={settingsItem.label}
            isActive={currentPath === settingsItem.href}
            onClick={
              mode === 'demo' ? () => handleDemoClick(settingsItem.href) : () => onMobileClose?.()
            }
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
        <div
          aria-hidden="true"
          className="bg-sidebar-accent absolute inset-0 rounded-xl shadow-sm"
        />
      )}

      <Icon className="relative z-10 h-4 w-4 shrink-0 transition-colors" />
      <span className="relative z-10 whitespace-nowrap transition-colors">{label}</span>
    </>
  );

  if (mode === 'demo') {
    return (
      <button
        type="button"
        className={cn(
          'group relative z-10 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[color,background-color,border-color,box-shadow]',
          mode === 'demo' && 'gap-2 rounded-lg px-2 py-2 text-xs',
          isActive
            ? 'text-sidebar-accent-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-current={isActive ? 'page' : undefined}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group relative z-10 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[color,background-color,border-color,box-shadow]',
        isActive
          ? 'text-sidebar-accent-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {content}
    </Link>
  );
}
