"use client";

import { useAuthModal } from "@/components/auth";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface SignInButtonProps {
  children?: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  showArrow?: boolean;
}

export function SignInButton({
  children = "Get Started",
  className,
  variant = "primary",
  size = "md",
  showArrow = false,
}: SignInButtonProps) {
  const { openAuthModal } = useAuthModal();

  const baseStyles = "inline-flex items-center justify-center gap-2 font-medium transition-all rounded-full";
  
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-card border border-border/60 text-foreground hover:bg-accent",
    ghost: "text-muted-foreground hover:text-foreground",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-10 py-5 text-lg",
  };

  return (
    <button
      onClick={openAuthModal}
      className={cn(baseStyles, variants[variant], sizes[size], "group", className)}
    >
      {children}
      {showArrow && (
        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
      )}
    </button>
  );
}
