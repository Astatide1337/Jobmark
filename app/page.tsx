import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { AuthModalProvider } from '@/components/auth';
import { JobmarkMark } from '@/components/brand/jobmark-mark';
import { AccessSection } from '@/components/landing/access-section';
import { EditorialHero } from '@/components/landing/editorial-hero';
import { FAQ } from '@/components/landing/faq';
import { FinalCTA } from '@/components/landing/final-cta';
import { FloatingNav } from '@/components/landing/floating-nav';
import { ProductTour } from '@/components/landing/product-tour';
import { UseCases } from '@/components/landing/use-cases';
import { VideoSection } from '@/components/landing/video-section';

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) {
    redirect('/dashboard');
  }

  return (
    <AuthModalProvider>
      <main className="bg-background">
        <FloatingNav />
        <EditorialHero />
        <ProductTour />
        <UseCases />
        <VideoSection />
        <AccessSection />
        <FAQ />
        <FinalCTA />

        <footer className="border-border/30 bg-card/20 border-t py-10">
          <div className="text-muted-foreground mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-6 text-sm sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="bg-primary flex h-7 w-7 items-center justify-center rounded-md">
                <JobmarkMark className="h-4 w-4" sizes="16px" />
              </div>
              <span className="text-foreground font-medium">Jobmark</span>
              <span aria-hidden="true" className="text-border">
                /
              </span>
              <span>© {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/articles" className="hover:text-foreground transition-colors">
                Guides
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </AuthModalProvider>
  );
}
