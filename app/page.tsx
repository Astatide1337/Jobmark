/**
 * jobmark Public Landing Page
 *
 * Why: This is the high-conversion entrance for the product. It uses
 * a "Scrollytelling" approach with editorial-style layouts to
 * communicate the value proposition.
 *
 * Pattern: Purely aesthetic Server Component that wraps everything in
 * the `AuthModalProvider` to allow "Sign In" triggers from any CTA
 * section without extra page reloads.
 */
import Link from 'next/link';
import { Pen } from 'lucide-react';
import { AuthModalProvider } from '@/components/auth';
import { FloatingNav } from '@/components/landing/floating-nav';
import { EditorialHero } from '@/components/landing/editorial-hero';
import { ProblemStatement } from '@/components/landing/problem-statement';
import { PersonaTabs } from '@/components/landing/persona-tabs';
import { ProductTour } from '@/components/landing/product-tour';
import { VideoSection } from '@/components/landing/video-section';
import { PricingSection } from '@/components/landing/pricing-section';
import { ProductValues } from '@/components/landing/product-values';
import { FAQ } from '@/components/landing/faq';
import { FinalCTA } from '@/components/landing/final-cta';
import { SectionDivider } from '@/components/landing/section-divider';

export default function Home() {
  return (
    <AuthModalProvider>
      <main className="bg-background">
        {/* Floating Navigation */}
        <FloatingNav />

        {/* Hero Section - Editorial Split Layout with Linear-style Dashboard */}
        <EditorialHero />

        {/* Divider */}
        <SectionDivider />

        {/* Problem Statement - Editorial Text */}
        <ProblemStatement />

        {/* Divider */}
        <SectionDivider delay={0.1} />

        {/* Persona Tabs - Use Cases */}
        <PersonaTabs />

        {/* Divider */}
        <SectionDivider delay={0.1} />

        {/* Product Tour - Scrollytelling Feature Showcase */}
        <ProductTour />

        {/* Divider */}
        <SectionDivider delay={0.1} />

        {/* Video Section - Demo */}
        <VideoSection />

        {/* Divider */}
        <SectionDivider delay={0.1} />

        {/* Pricing Section */}
        <PricingSection />

        {/* Divider */}
        <SectionDivider delay={0.1} />

        {/* Product Values - Accordion Style */}
        <ProductValues />

        {/* Divider */}
        <SectionDivider delay={0.1} />

        {/* FAQ - Common Questions */}
        <FAQ />

        {/* Divider */}
        <SectionDivider delay={0.1} glow />

        {/* Final CTA */}
        <FinalCTA />

        {/* Footer - Minimal Cafe Style */}
        <footer className="border-border/20 bg-card/30 relative z-10 border-t py-12">
          <div className="text-muted-foreground mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 text-sm md:flex-row">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 border-primary/20 flex h-7 w-7 items-center justify-center rounded-md border">
                <Pen className="text-primary h-3.5 w-3.5" />
              </div>
              <span className="text-foreground font-serif">Jobmark</span>
              <span className="text-border">|</span>
              <span>© {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-8">
              <Link href="#" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <span className="text-muted-foreground/50">Made with ❤️</span>
            </div>
          </div>
        </footer>
      </main>
    </AuthModalProvider>
  );
}
