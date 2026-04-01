'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center px-6">
      <div className="border-border/60 bg-card/45 w-full max-w-md rounded-2xl border p-8 text-center">
        <div className="bg-destructive/10 border-destructive/20 mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border">
          <AlertCircle className="text-destructive h-5 w-5" />
        </div>
        <p className="text-primary mb-2 text-xs font-semibold uppercase tracking-widest">Error</p>
        <h1 className="text-foreground font-serif mb-3 text-2xl font-semibold">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          An unexpected error occurred. You can try again or return to the dashboard.
          {error.digest && (
            <span className="text-muted-foreground/50 mt-2 block font-mono text-xs">
              Ref: {error.digest}
            </span>
          )}
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={reset} variant="outline" size="sm">
            Try again
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
