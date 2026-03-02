/**
 * Dashboard Header
 *
 * Why: Provides the persistent top bar for the authenticated experience.
 * It manages user identity display, global settings access, and mobile
 * menu triggers.
 *
 * Design: Uses a backdrop-blur for a "premium" glassmorphism effect.
 * Hydration Safety: Generates initials client-side from the session name
 * to ensure consistency.
 */
'use client';

import { signOutUser } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pen, Settings, LogOut, Calendar, ChevronDown, Menu } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface DashboardHeaderProps {
  userName?: string | null;
  userImage?: string | null;
  showDate?: boolean;
  title?: string;
  onMenuClick?: () => void;
}

export function DashboardHeader({
  userName,
  userImage,
  showDate = false,
  title,
  onMenuClick,
}: DashboardHeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOutUser();
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Generate initials from name, or use first letter of email
  const initials = userName
    ? userName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <header className="border-border/50 bg-card/30 sticky top-0 z-30 mb-5 border-b backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>

          {/* Mobile Logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="bg-primary/20 flex h-8 w-8 items-center justify-center rounded-lg">
              <Pen className="text-primary h-4 w-4" />
            </div>
          </div>

          {/* Title or Date */}
          <div className="flex flex-col">
            {title ? (
              <h1 className="max-w-[200px] truncate text-sm font-semibold lg:max-w-none lg:text-lg">
                {title}
              </h1>
            ) : showDate ? (
              <div className="text-muted-foreground hidden items-center gap-2 lg:flex">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* User Menu */}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userImage || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm sm:inline">{userName}</span>
              <ChevronDown className="text-muted-foreground h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2"
              onClick={handleSignOut}
              disabled={isLoggingOut}
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? 'Signing out...' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
