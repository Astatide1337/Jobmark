import { FileText, FolderOpen, Link2, NotebookPen, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SectionHeading } from './section-heading';

const useCases = [
  {
    title: 'After a busy week',
    description:
      'Keep the details that disappear first: a fix, a decision, a launch, or something you learned.',
    outcome: 'Find the week again without rebuilding it from messages and memory.',
    icon: NotebookPen,
    details: [
      { label: 'Add notes', icon: NotebookPen },
      { label: 'Group by project', icon: FolderOpen },
    ],
  },
  {
    title: 'Before a review',
    description:
      'Select the notes that matter and use them as the starting point for a weekly, monthly, or quarterly review draft.',
    outcome: 'Walk in with examples you already recorded.',
    icon: FileText,
    details: [
      { label: 'Build review draft', icon: FileText },
      { label: 'Export record', icon: Upload },
    ],
  },
  {
    title: 'When you want AI help',
    description:
      'Connect Claude, ChatGPT, Gemini, or another MCP-compatible assistant instead of moving your work into a separate chat product.',
    outcome: 'Keep Jobmark as the record and choose the assistant.',
    icon: Link2,
    details: [
      { label: 'Connect an assistant', icon: Link2 },
      { label: 'Keep notes as the source', icon: NotebookPen },
    ],
  },
] as const;

export function UseCases() {
  return (
    <section id="use-cases" className="border-border/30 border-t py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="Use cases"
          title="Keep the work once. Use it in more than one place."
          description="The same record can help with a weekly update, a review draft, a project check-in, or a conversation with your assistant."
          align="center"
        />

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {useCases.map(({ title, description, outcome, icon: Icon, details }) => (
            <Card key={title} className="h-full">
              <CardHeader>
                <div className="bg-primary/10 text-primary mb-2 flex h-11 w-11 items-center justify-center rounded-xl">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="font-serif text-2xl">{title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-border/50 border-t pt-5">
                  <p className="text-sm font-medium">{outcome}</p>
                  <div className="text-muted-foreground mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
                    {details.map(({ label, icon: DetailIcon }) => (
                      <span key={label} className="flex items-center gap-1.5">
                        <DetailIcon className="text-primary h-3.5 w-3.5" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
