"use client";

import { ReactNode } from "react";
import { AuthModalProvider } from "@/components/auth";

interface LandingPageClientProps {
  children: ReactNode;
}

export function LandingPageClient({ children }: LandingPageClientProps) {
  return <AuthModalProvider>{children}</AuthModalProvider>;
}
