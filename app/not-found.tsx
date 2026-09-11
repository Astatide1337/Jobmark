import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { JobmarkMark } from '@/components/brand/jobmark-mark';

export default function NotFoundPage() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="bg-primary mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl">
          <JobmarkMark className="h-6 w-6" sizes="24px" />
        </div>
        <p className="text-primary mb-2 text-xs font-semibold tracking-widest uppercase">404</p>
        <h1 className="text-foreground mb-3 font-serif text-3xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          This page does not exist.
        </p>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
