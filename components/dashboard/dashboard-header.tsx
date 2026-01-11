"use client";

import { signOutUser } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Pen, Settings, LogOut, Calendar, ChevronDown } from "lucide-react";
import Link from "next/link";

interface DashboardHeaderProps {
  userName?: string | null;
  userImage?: string | null;
  showDate?: boolean;
  title?: string;
}

export function DashboardHeader({ 
  userName, 
  userImage, 
  showDate = false,
  title 
}: DashboardHeaderProps) {
  const initials = userName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <header className="border-b border-border/50 bg-card/30">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Pen className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold">Jobmark</span>
        </div>

        {/* Title or Date */}
        <div className="hidden lg:block">
          {title ? (
            <h1 className="text-lg font-semibold">{title}</h1>
          ) : showDate ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          ) : null}
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
              <span className="hidden sm:inline text-sm">{userName}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <form action={signOutUser}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
