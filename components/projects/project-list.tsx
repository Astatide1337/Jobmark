'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  archiveProject,
  createProject,
  unarchiveProject,
  updateProject,
} from '@/app/actions/projects';
import { projectColors } from '@/lib/constants';
import {
  FolderPlus,
  Plus,
  FolderOpen,
  Archive,
  Search,
  ArrowUpDown,
  MoreVertical,
  Pencil,
  Clock,
  Activity,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  color: string;
  description: string | null;
  archived: boolean;
  _count: {
    activities: number;
  };
  activities: { createdAt: Date }[];
}

export interface ProjectListProps {
  projects: Project[];
  initialFilter: 'active' | 'archived';
  openCreate?: boolean;
  onCreate?: (
    data: FormData
  ) => Promise<{ success: boolean; message: string; errors?: Record<string, string[]> }>;
  onUpdate?: (
    id: string,
    data: FormData
  ) => Promise<{ success: boolean; message: string; errors?: Record<string, string[]> }>;
  onArchive?: (id: string) => Promise<void>;
  onUnarchive?: (id: string) => Promise<void>;
  onTabChange?: (value: string) => void;
  disableNavigation?: boolean;
  onViewTimeline?: (id: string) => void;
}

export function ProjectList({
  projects,
  initialFilter,
  openCreate = false,
  onCreate,
  onUpdate,
  onArchive,
  onUnarchive,
  onTabChange,
  disableNavigation,
  onViewTimeline,
}: ProjectListProps) {
  const [showCreate, setShowCreate] = useState(openCreate);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'recent' | 'activity' | 'name'>('recent');

  // Clear ?new param from URL when modal closes
  useEffect(() => {
    if (openCreate && !showCreate) {
      if (!disableNavigation) {
        router.replace('/projects', { scroll: false });
      }
    }
  }, [showCreate, openCreate, router, disableNavigation]);

  const handleTabChange = (value: string) => {
    if (onTabChange) {
      onTabChange(value);
    } else {
      router.push(`/projects?filter=${value}`);
    }
  };

  // Filter and Sort Logic
  const filteredProjects = projects
    .filter(project => {
      const query = searchQuery.toLowerCase();
      return (
        project.name.toLowerCase().includes(query) ||
        (project.description && project.description.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      if (sortOption === 'recent') {
        const dateA = a.activities[0]?.createdAt
          ? new Date(a.activities[0].createdAt).getTime()
          : 0;
        const dateB = b.activities[0]?.createdAt
          ? new Date(b.activities[0].createdAt).getTime()
          : 0;
        return dateB - dateA;
      }
      if (sortOption === 'activity') {
        return b._count.activities - a._count.activities;
      }
      if (sortOption === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  if (projects.length === 0 && initialFilter === 'active') {
    return (
      <>
        <Card className="bg-card/40 border-border/40 rounded-2xl border-dashed">
          <CardContent className="py-12 text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
              <FolderOpen className="text-primary h-6 w-6" />
            </div>
            <h3 className="text-foreground mb-2 font-semibold">No projects yet</h3>
            <p className="text-muted-foreground mx-auto mb-6 max-w-sm text-sm">
              Create projects to organize your activities and generate focused reports.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Create Your First Project
            </Button>

            <div className="mt-8">
              <Button variant="link" size="sm" onClick={() => handleTabChange('archived')}>
                View Archived Projects
              </Button>
            </div>
          </CardContent>
        </Card>
        <ProjectDialog open={showCreate} onOpenChange={setShowCreate} onSubmit={onCreate} />
      </>
    );
  }

  // Handle empty state for archived
  if (projects.length === 0 && initialFilter === 'archived') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Tabs value={initialFilter} onValueChange={handleTabChange} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="active">Active Projects</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card className="bg-card/40 border-border/40 rounded-2xl border-dashed">
          <CardContent className="py-12 text-center">
            <div className="bg-muted mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
              <Archive className="text-muted-foreground h-6 w-6" />
            </div>
            <h3 className="text-foreground mb-2 font-semibold">No archived projects</h3>
            <p className="text-muted-foreground mx-auto max-w-sm text-sm">
              Projects you archive will appear here safely stored away.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Tabs value={initialFilter} onValueChange={handleTabChange} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="active">Active Projects</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
          </Tabs>

          {initialFilter === 'active' && (
            <Button onClick={() => setShowCreate(true)} size="sm" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          )}
        </div>

        {/* Toolbar: Search & Sort */}
        <div className="bg-card/40 border-border/40 flex items-center gap-3 rounded-xl border p-2 shadow-sm backdrop-blur-sm">
          <div className="relative flex-1">
            <Search className="text-muted-foreground/60 absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-background/50 border-border/40 h-9 pl-9"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 shrink-0 gap-2">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sort by:</span>
                <span className="font-medium">
                  {sortOption === 'recent' && 'Recent'}
                  {sortOption === 'activity' && 'Activity'}
                  {sortOption === 'name' && 'Name'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortOption('recent')}>
                Most Recent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('activity')}>
                Most Activity
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('name')}>Name (A-Z)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.length === 0 ? (
          <div className="text-muted-foreground col-span-full py-12 text-center italic">
            No projects match your search.
          </div>
        ) : (
          filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onUpdate={onUpdate}
              disableNavigation={disableNavigation}
              onViewTimeline={onViewTimeline}
            />
          ))
        )}
      </div>

      <ProjectDialog open={showCreate} onOpenChange={setShowCreate} onSubmit={onCreate} />
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  onArchive?: (id: string) => Promise<void>;
  onUnarchive?: (id: string) => Promise<void>;
  onUpdate?: (
    id: string,
    data: FormData
  ) => Promise<{ success: boolean; message: string; errors?: Record<string, string[]> }>;
  disableNavigation?: boolean;
  onViewTimeline?: (id: string) => void;
}

function ProjectCard({
  project,
  onArchive,
  onUnarchive,
  onUpdate,
  disableNavigation,
  onViewTimeline,
}: ProjectCardProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleArchive = () => {
    startTransition(async () => {
      if (onArchive) {
        await onArchive(project.id);
      } else {
        await archiveProject(project.id);
      }
    });
  };

  const handleUnarchive = () => {
    startTransition(async () => {
      if (onUnarchive) {
        await onUnarchive(project.id);
      } else {
        await unarchiveProject(project.id);
      }
    });
  };

  const lastActive = project.activities[0]?.createdAt;

  return (
    <>
      <Card
        className={cn(
          'bg-card/40 border-border/40 group/project hover:border-border hover:shadow-primary/5 relative flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-xl',
          project.archived && 'bg-muted/10 border-border/30 opacity-75'
        )}
      >
        <Link
          href={disableNavigation ? '#' : `/projects/${project.id}`}
          onClick={e => disableNavigation && e.preventDefault()}
          className={cn(
            'focus-visible:ring-ring focus-visible:ring-offset-background flex h-full flex-1 flex-col rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            disableNavigation && 'cursor-default'
          )}
        >
          <CardContent className="relative flex-1 p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div
                className="group-hover/project:bg-primary/10 relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/5 shadow-sm transition-all duration-300 group-hover/project:scale-105 group-hover/project:shadow-md"
                style={{
                  backgroundColor: project.archived ? 'hsl(var(--muted))' : `${project.color}15`,
                }}
              >
                <FolderOpen
                  className="h-7 w-7"
                  style={{
                    color: project.archived ? 'hsl(var(--muted-foreground))' : project.color,
                  }}
                />
                {project.archived && (
                  <div className="bg-background/40 absolute inset-0 flex items-center justify-center rounded-2xl backdrop-blur-sm">
                    <Archive className="text-muted-foreground h-4 w-4" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3
                className={cn(
                  'text-foreground truncate pr-8 text-xl font-bold transition-colors',
                  !project.archived && 'group-hover/project:text-primary'
                )}
              >
                {project.name}
              </h3>

              <div className="min-h-[2.5rem]">
                {project.description ? (
                  <p className="text-muted-foreground/80 line-clamp-2 text-sm leading-relaxed">
                    {project.description}
                  </p>
                ) : (
                  <div className="h-full w-full opacity-0" aria-hidden="true">
                    No description provided
                  </div>
                )}
              </div>
            </div>
          </CardContent>

          <div className="mt-auto flex flex-col gap-2 px-6 pt-0 pb-6">
            <div className="bg-border/40 mb-3 h-px w-full" />

            <div className="text-muted-foreground/70 flex w-full items-center justify-between gap-4 text-[11px] font-medium tracking-wider uppercase">
              <div
                className="bg-muted/30 border-border/20 flex items-center gap-2 rounded-xl border px-2.5 py-1"
                title="Total Activities Logged"
              >
                <Activity className="h-3 w-3" />
                <span>{project._count.activities} entries</span>
              </div>
              {lastActive && (
                <div className="flex items-center gap-1.5" title="Last Activity">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(lastActive))} ago
                </div>
              )}
            </div>
          </div>
        </Link>

        <div className="absolute top-5 right-5 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:bg-muted/40 hover:text-primary h-8 w-8 p-0 opacity-50 transition-all group-hover/project:opacity-100"
                disabled={isPending}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
              <DropdownMenuItem asChild>
                <Link
                  href={disableNavigation ? '#' : `/projects/${project.id}`}
                  onClick={e => {
                    if (onViewTimeline) {
                      e.preventDefault();
                      onViewTimeline(project.id);
                    } else if (disableNavigation) {
                      e.preventDefault();
                    }
                  }}
                  className="cursor-pointer"
                >
                  <Activity className="mr-2 h-4 w-4" /> View Timeline
                </Link>
              </DropdownMenuItem>

              {!project.archived && (
                <DropdownMenuItem onClick={() => setShowEdit(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit Details
                </DropdownMenuItem>
              )}

              {project.archived ? (
                <DropdownMenuItem
                  onClick={handleUnarchive}
                  className="text-primary focus:text-primary focus:bg-primary/10 font-medium"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Restore Project
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem variant="destructive" onClick={handleArchive}>
                  <Archive className="mr-2 h-4 w-4" /> Archive Project
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      <ProjectDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        project={project}
        onSubmit={onUpdate ? data => onUpdate(project.id, data) : undefined}
      />
    </>
  );
}

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: {
    id: string;
    name: string;
    description: string | null;
    color: string;
  };
  onSubmit?: (
    data: FormData
  ) => Promise<{ success: boolean; message: string; errors?: Record<string, string[]> }>;
}

function ProjectDialog({ open, onOpenChange, project, onSubmit }: ProjectDialogProps) {
  const isEditing = !!project;
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(projectColors[0]);
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (open) {
      setName(project?.name || '');
      setDescription(project?.description || '');
      setColor(project?.color || projectColors[0]);
      setErrors({});
    }
  }, [open, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('color', color);
      formData.append('description', description);

      let result: { success: boolean; message: string; errors?: Record<string, string[]> };
      if (onSubmit) {
        result = await onSubmit(formData);
      } else if (isEditing && project) {
        result = await updateProject(project.id, { name, color, description });
      } else {
        result = (await createProject({ success: false, message: '' }, formData)) as {
          success: boolean;
          message: string;
          errors?: Record<string, string[]>;
        };
      }

      if (result.success) {
        onOpenChange(false);
      } else if (result.errors?.name) {
        setErrors({ name: result.errors.name[0] });
      } else {
        console.error(result.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Project' : 'New Project'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update your project details.' : 'Create a container for your activities.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
              maxLength={50}
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Description (Optional)</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief details about this project..."
              className="h-20 resize-none"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {projectColors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full transition-all ${
                    color === c
                      ? 'ring-ring ring-offset-background scale-110 ring-2 ring-offset-2'
                      : 'opacity-80 hover:scale-110 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
