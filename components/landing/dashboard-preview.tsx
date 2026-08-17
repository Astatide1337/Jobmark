'use client';

import { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Check,
  Coffee,
  FileText,
  FolderOpen,
  Link2,
  Pen,
  Users,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

const mobileViews = [
  { href: '/dashboard', label: 'Capture' },
  { href: '/projects', label: 'Projects' },
  { href: '/reports', label: 'Reviews' },
  { href: '/settings/connections', label: 'Connect AI' },
] as const;

export function DashboardPreview() {
  const [activePath, setActivePath] = useState('/dashboard');

  return (
    <div className="border-border/60 bg-background relative overflow-hidden rounded-2xl border shadow-2xl shadow-black/20">
      <div className="bg-card/50 border-border/50 flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-5">
        <div>
          <p className="text-foreground text-sm font-medium">Jobmark</p>
          <p className="text-muted-foreground text-xs">Interactive product preview</p>
        </div>
        <Badge variant="secondary">Example data</Badge>
      </div>

      <div className="flex min-h-[520px] sm:min-h-[580px]">
        <Sidebar mode="demo" activePath={activePath} onDemoNavigate={setActivePath} />

        <div className="min-w-0 flex-1">
          <div className="border-border/50 bg-card/20 flex items-center justify-between border-b px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Example workspace</p>
              <p className="truncate text-sm font-semibold">{titleForPath(activePath)}</p>
            </div>
            <span className="bg-primary/15 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              DU
            </span>
          </div>

          <div className="border-border/50 scrollbar-none flex gap-1 overflow-x-auto border-b p-2 sm:hidden">
            {mobileViews.map(view => (
              <Button
                key={view.href}
                type="button"
                size="sm"
                variant={activePath === view.href ? 'secondary' : 'ghost'}
                onClick={() => setActivePath(view.href)}
                className="shrink-0"
              >
                {view.label}
              </Button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            <PreviewPanel path={activePath} />
          </div>
        </div>
      </div>
    </div>
  );
}

function titleForPath(path: string) {
  if (path === '/projects') return 'Projects';
  if (path === '/reports') return 'Reviews';
  if (path === '/insights') return 'Insights';
  if (path === '/focus') return 'Focus';
  if (path === '/network') return 'Network';
  if (path === '/settings/connections') return 'Connect AI';
  if (path === '/articles') return 'Guides';
  return 'Capture';
}

function PreviewPanel({ path }: { path: string }) {
  if (path === '/projects') return <ProjectsPanel />;
  if (path === '/reports') return <ReviewsPanel />;
  if (path === '/insights') return <InsightsPanel />;
  if (path === '/focus') return <FocusPanel />;
  if (path === '/network') return <NetworkPanel />;
  if (path === '/settings/connections') return <ConnectionsPanel />;
  if (path === '/articles') return <GuidesPanel />;
  return <CapturePanel />;
}

function PreviewHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h3 className="text-xl font-semibold sm:text-2xl">{title}</h3>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
    </div>
  );
}

function CapturePanel() {
  const [saved, setSaved] = useState(false);

  return (
    <div className="mx-auto max-w-2xl">
      <PreviewHeading title="Add a note" description="Save the useful part while it is fresh." />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">What happened today?</CardTitle>
          <CardDescription>A short note is enough.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            readOnly
            value="Finished the quarterly review and walked the team through the key decisions."
            aria-label="Example work note"
            className="min-h-24 resize-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="secondary">Q4 planning</Badge>
            <Button type="button" size="sm" onClick={() => setSaved(true)}>
              {saved ? <Check /> : <Pen />}
              {saved ? 'Note saved' : 'Save note'}
            </Button>
          </div>
        </CardContent>
      </Card>
      <p className="text-muted-foreground mt-3 text-xs">
        This preview uses the same note, project, and button language as the app.
      </p>
    </div>
  );
}

function ProjectsPanel() {
  const projects = [
    { name: 'Website redesign', notes: '8 notes', progress: 72 },
    { name: 'Q4 planning', notes: '5 notes', progress: 48 },
    { name: 'Mobile launch', notes: '11 notes', progress: 86 },
  ];

  return (
    <div>
      <PreviewHeading title="Projects" description="Keep related notes together." />
      <div className="grid gap-3 lg:grid-cols-3">
        {projects.map(project => (
          <Card key={project.name}>
            <CardHeader className="p-4 pb-3">
              <div className="bg-primary/10 text-primary mb-2 flex h-9 w-9 items-center justify-center rounded-lg">
                <FolderOpen className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm">{project.name}</CardTitle>
              <CardDescription>{project.notes}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Progress value={project.progress} aria-label={`${project.name} progress`} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReviewsPanel() {
  return (
    <div className="mx-auto max-w-2xl">
      <PreviewHeading
        title="Review drafts"
        description="Start with notes you already saved instead of rebuilding the quarter from memory."
      />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Q4 review draft</CardTitle>
              <CardDescription>Built from selected notes</CardDescription>
            </div>
            <Badge>Draft</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            {[
              'Finished the checkout redesign and documented the rollout.',
              'Led quarterly planning and clarified the next set of priorities.',
              'Helped two teammates get through onboarding tasks.',
            ].map(item => (
              <li key={item} className="text-muted-foreground flex items-start gap-2">
                <Check className="text-success mt-0.5 h-4 w-4 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="secondary">Ready to edit</Badge>
            <Badge variant="outline">Export available</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InsightsPanel() {
  const days = [38, 64, 52, 78, 46, 82, 58];

  return (
    <div>
      <PreviewHeading title="Insights" description="See when and where your notes are adding up." />
      <div className="grid gap-3 lg:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Notes by day</CardTitle>
            <CardDescription>Example activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-36 items-end gap-2" aria-label="Example note activity chart">
              {days.map((height, index) => (
                <div key={index} className="bg-muted flex h-full flex-1 items-end overflow-hidden rounded-md">
                  <div
                    className="bg-primary/80 w-full rounded-md"
                    style={{ height: `${height}%` }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
              <BarChart3 className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Project view</CardTitle>
            <CardDescription>See which projects appear most often in your notes.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

function FocusPanel() {
  return (
    <div className="mx-auto max-w-2xl">
      <PreviewHeading title="Focus" description="Use a short guided focus session between tasks." />
      <Card>
        <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
          <div className="border-primary/30 bg-primary/5 flex h-28 w-28 items-center justify-center rounded-full border">
            <Coffee className="text-primary h-8 w-8" />
          </div>
          <p className="mt-5 font-medium">Breathe in</p>
          <p className="text-muted-foreground mt-1 text-sm">A quiet block before the next task.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function NetworkPanel() {
  const conversations = [
    ['Maya Chen', 'Project handoff', 'Yesterday'],
    ['Jordan Lee', 'Career check-in', 'Last week'],
  ];

  return (
    <div>
      <PreviewHeading title="Network" description="Keep useful conversations next to the work they relate to." />
      <div className="grid gap-3 lg:grid-cols-2">
        {conversations.map(([name, subject, when]) => (
          <Card key={name}>
            <CardHeader className="p-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm">{name}</CardTitle>
                  <CardDescription>{subject}</CardDescription>
                  <p className="text-muted-foreground mt-2 text-xs">{when}</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ConnectionsPanel() {
  const assistants = ['Claude', 'ChatGPT', 'Gemini'];

  return (
    <div>
      <PreviewHeading
        title="Connect AI"
        description="Connect the assistant you already use when you want help with your record or a draft."
      />
      <div className="grid gap-3 lg:grid-cols-3">
        {assistants.map((assistant, index) => (
          <Card key={assistant}>
            <CardHeader className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                  <Link2 className="h-4 w-4" />
                </div>
                {index === 0 ? <Badge variant="secondary">Example</Badge> : null}
              </div>
              <CardTitle className="text-sm">{assistant}</CardTitle>
              <CardDescription>Use Jobmark through an MCP connection.</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

function GuidesPanel() {
  const guides = [
    ['Write a useful work note', Pen],
    ['Prepare for a review', FileText],
    ['Use projects to group work', FolderOpen],
  ] as const;

  return (
    <div>
      <PreviewHeading title="Guides" description="Short guides for the workflows Jobmark supports." />
      <div className="space-y-3">
        {guides.map(([title, Icon]) => (
          <Card key={title}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{title}</p>
                <p className="text-muted-foreground text-xs">Open guide</p>
              </div>
              <BookOpen className="text-muted-foreground h-4 w-4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
