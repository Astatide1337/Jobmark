import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pen, BarChart3, FileText, Clock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Pen className="h-4 w-4 text-primary" />
            </div>
            <span className="text-lg font-semibold text-foreground">Jobmark</span>
          </Link>
          
          <Link href="/login">
            <Button variant="secondary" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-primary font-medium mb-4">
            For professionals who value their time
          </p>
          
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight mb-6">
            Capture your daily wins.
            <br />
            <span className="text-muted-foreground">Generate reports instantly.</span>
          </h1>
          
          <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl">
            Log accomplishments in under 30 seconds. Let AI transform your notes 
            into professional, manager-ready reports with one click.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started — Free
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={Clock}
            title="30-Second Logging"
            description="Quick capture that feels effortless, like jotting a note"
          />
          <FeatureCard
            icon={FileText}
            title="AI-Powered Reports"
            description="Transform raw notes into polished, professional documents"
          />
          <FeatureCard
            icon={BarChart3}
            title="Progress Insights"
            description="Visualize your productivity with meaningful analytics"
          />
          <FeatureCard
            icon={Pen}
            title="Project Grouping"
            description="Organize activities by project for focused reporting"
          />
        </div>
      </section>

      {/* Social Proof */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-8 sm:p-12">
            <blockquote className="text-xl sm:text-2xl text-foreground font-medium leading-relaxed mb-6">
              "Finally, a tool that makes tracking my work feel effortless. 
              I never miss an accomplishment anymore."
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">SC</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Sarah Chen</p>
                <p className="text-sm text-muted-foreground">Software Engineer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-3xl sm:text-4xl font-bold text-primary mb-2">30s</p>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Avg. Log Time</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-bold text-primary mb-2">10k+</p>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Professionals</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-bold text-primary mb-2">4.9</p>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">User Rating</p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Start tracking your wins today
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Join thousands of professionals who never forget their accomplishments.
          </p>
          <Link href="/login">
            <Button size="lg">
              Get Started — Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between text-sm text-muted-foreground">
          <p>Jobmark</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card className="bg-card/50 border-border/50 card-hover">
      <CardContent className="p-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
