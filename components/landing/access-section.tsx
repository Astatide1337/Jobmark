'use client';

import { ArrowRight, Database, KeyRound, Link2 } from 'lucide-react';
import { useAuthModal } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionHeading } from './section-heading';

const trustPoints = [
  {
    title: 'Export your record',
    description: 'Download the work you saved and take it somewhere else whenever you want.',
    icon: Database,
  },
  {
    title: 'Choose the assistant',
    description: 'Connect an MCP-compatible assistant only when you want help with your record or a draft.',
    icon: Link2,
  },
  {
    title: 'Protect private projects',
    description: 'Private projects can be protected behind Jobmark\'s vault flow.',
    icon: KeyRound,
  },
] as const;

export function AccessSection() {
  const { openAuthModal } = useAuthModal();

  return (
    <section id="access" className="border-border/30 border-t py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <SectionHeading
              eyebrow="Your record"
              title="Useful without locking you in."
              description="Jobmark is built around the notes you keep, not around trapping those notes inside one assistant or one output."
            />
            <Button size="lg" onClick={openAuthModal} className="group mt-8">
              Add a note
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {trustPoints.map(({ title, description, icon: Icon }) => (
              <Card key={title} className="h-full">
                <CardHeader className="p-5">
                  <div className="bg-primary/10 text-primary mb-2 flex h-10 w-10 items-center justify-center rounded-xl">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
