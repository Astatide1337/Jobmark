import { cn } from '@/lib/utils';

interface ArticlesLayoutProps {
  children: React.ReactNode;
}

export default function ArticlesLayout({ children }: ArticlesLayoutProps) {
  return (
    <main
      className={cn(
        'relative mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8'
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,var(--primary),transparent_65%)] opacity-[0.08]"
      />
      {children}
    </main>
  );
}
