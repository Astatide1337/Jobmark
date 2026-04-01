import Link from 'next/link';
import { Pen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="bg-primary/10 border-primary/20 mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border">
          <Pen className="text-primary h-5 w-5" />
        </div>
        <p className="text-primary mb-2 text-xs font-semibold uppercase tracking-widest">404</p>
        <h1 className="text-foreground font-serif mb-3 text-3xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          This page doesn&apos;t exist or may have been moved.
        </p>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
