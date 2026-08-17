import { ArrowRight, CircleDot, FileText, FolderOpen, Link2, Pen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionHeading } from './section-heading';

const steps = [
  {
    number: '01',
    title: 'Write',
    description: 'Save one short note about what changed, shipped, or got solved.',
    icon: Pen,
  },
  {
    number: '02',
    title: 'Group',
    description: 'Put related notes in a project so the work stays easy to find.',
    icon: FolderOpen,
  },
  {
    number: '03',
    title: 'Use',
    description: 'Build a review draft or write an update from notes you already saved.',
    icon: FileText,
  },
  {
    number: '04',
    title: 'Review',
    description: 'Look back at the record yourself or connect the assistant you already use.',
    icon: Link2,
  },
] as const;

export function ProductTour() {
  return (
    <section id="product-tour" className="border-border/30 border-t py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="How it works"
          title="A note becomes useful when you can find it again."
          description="Jobmark keeps the workflow small: write the note, put it with the right work, then use it when an update or review comes around."
        />

        <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ number, title, description, icon: Icon }, index) => (
            <Card key={title} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-muted-foreground font-mono text-xs">{number}</span>
                </div>
                <CardTitle className="mt-2 text-lg">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
              </CardContent>
              {index < steps.length - 1 ? (
                <ArrowRight
                  aria-hidden="true"
                  className="text-border absolute top-1/2 -right-2.5 z-10 hidden h-5 w-5 -translate-y-1/2 lg:block"
                />
              ) : null}
            </Card>
          ))}
        </div>

        <div className="border-border/50 bg-card/30 mt-8 rounded-2xl border p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-medium">The record stays at the center.</p>
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
                Jobmark can build drafts and hand context to a connected assistant, but your saved
                notes remain the source you can inspect, edit, and export.
              </p>
            </div>
            <ProductFlowLegend />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductFlowLegend() {
  const items = [
    { label: 'Write', icon: Pen },
    { label: 'Group', icon: FolderOpen },
    { label: 'Use', icon: FileText },
    { label: 'Review', icon: CircleDot },
  ];

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
      {items.map(({ label, icon: Icon }, index) => (
        <div key={label} className="flex items-center gap-2">
          {index > 0 ? <span aria-hidden="true">→</span> : null}
          <span className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5" />
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
