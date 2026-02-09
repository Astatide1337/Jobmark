import Link from "next/link";
import { Pen } from "lucide-react";
import { FloatingNav } from "@/components/landing/floating-nav";
import { EditorialHero } from "@/components/landing/editorial-hero";
import { ProblemStatement } from "@/components/landing/problem-statement";
import { PersonaTabs } from "@/components/landing/persona-tabs";
import { ProductTour } from "@/components/landing/product-tour";
import { VideoSection } from "@/components/landing/video-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { ProductValues } from "@/components/landing/product-values";
import { FAQ } from "@/components/landing/faq";
import { FinalCTA } from "@/components/landing/final-cta";
import { SectionDivider } from "@/components/landing/section-divider";
import { LandingPageClient } from "@/components/landing/landing-page-client";

export default function Home() {
  return (
    <LandingPageClient>
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
      <footer className="border-t border-border/20 py-12 bg-card/30 relative z-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20">
              <Pen className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-serif text-foreground">Jobmark</span>
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
            <span className="text-muted-foreground/50">
              Made with ❤️
            </span>
          </div>
        </div>
      </footer>
    </main>
    </LandingPageClient>
  );
}
