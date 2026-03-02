'use client';

import { useEffect, useState, useCallback, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import debounce from 'lodash.debounce';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  FileText,
  FolderOpen,
  Home,
  Plus,
  Search,
  FileBarChart,
  Sparkles,
  Users,
  MessageSquare,
  Calendar,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { globalSearch, getRecentProjects, type SearchResult } from '@/app/actions/search';
import { format } from 'date-fns';

// Quick action definitions
const quickActions = [
  { id: 'log', label: 'Log New Activity', icon: Plus, action: 'focus-capture' },
  { id: 'view-reports', label: 'View Reports', icon: FileBarChart, href: '/reports?tab=history' },
  { id: 'create-report', label: 'Create Report', icon: Sparkles, href: '/reports?tab=new' },
  { id: 'project', label: 'Create Project', icon: FolderOpen, href: '/projects?new=true' },
];

// Navigation items
const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
  { id: 'projects', label: 'Projects', icon: FolderOpen, href: '/projects' },
  { id: 'network', label: 'Network', icon: Users, href: '/network' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentProjects, setRecentProjects] = useState<
    { id: string; name: string; color: string }[]
  >([]);
  const [selectedActivity, setSelectedActivity] = useState<SearchResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Load recent items when dialog opens
  useEffect(() => {
    if (open && recentProjects.length === 0) {
      getRecentProjects().then(setRecentProjects);
    }
  }, [open, recentProjects.length]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search logic
  const debouncedSearch = useMemo(
    () =>
      debounce(async (searchQuery: string) => {
        startTransition(async () => {
          const searchResults = await globalSearch(searchQuery);
          setResults(searchResults);
        });
      }, 200),
    []
  );

  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    debouncedSearch(query);

    return () => {
      debouncedSearch.cancel();
    };
  }, [query, debouncedSearch]);

  const handleSelect = useCallback(
    (item: { href?: string; action?: string }) => {
      setOpen(false);
      setQuery('');

      if (item.action === 'focus-capture') {
        // Focus the quick capture textarea
        setTimeout(() => {
          const textarea = document.querySelector<HTMLTextAreaElement>(
            '[data-quick-capture="true"]'
          );
          textarea?.focus();
        }, 100);
        return;
      }

      if (item.href) {
        router.push(item.href);
      }
    },
    [router]
  );

  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setQuery('');

      if (result.type === 'activity') {
        setSelectedActivity(result);
        return;
      }

      router.push(result.url);
    },
    [router]
  );

  const isSearching = query.trim().length > 0;

  // Use derived state for results to avoid setting state in the effect
  const displayedResults = isSearching ? results : [];

  // Manual filtering logic for static items
  const filteredQuickActions = quickActions.filter(action =>
    action.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  const filteredNavigationItems = navigationItems.filter(item =>
    item.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search Everything"
        description="Search for activities, projects, reports, contacts, interactions, or navigate anywhere"
        showCloseButton={false}
        shouldFilter={false} // Disable internal filtering to allow server results (e.g. "today") to show
      >
        <CommandInput placeholder="Search everything..." value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>{isPending ? 'Searching...' : 'No results found.'}</CommandEmpty>

          {filteredQuickActions.length > 0 && (
            <CommandGroup heading="Quick Actions">
              {filteredQuickActions.map(action => (
                <CommandItem
                  key={action.id}
                  onSelect={() => handleSelect(action)}
                  className="flex items-center gap-3"
                >
                  <action.icon className="h-4 w-4" />
                  <span>{action.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {filteredNavigationItems.length > 0 && (
            <CommandGroup heading="Navigation">
              {filteredNavigationItems.map(item => (
                <CommandItem
                  key={item.id}
                  onSelect={() => handleSelect(item)}
                  className="flex items-center gap-3"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!query && recentProjects.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Recent Projects">
                {recentProjects.map(project => (
                  <CommandItem
                    key={project.id}
                    onSelect={() => handleSelect({ href: `/projects/${project.id}` })}
                    className="flex items-center gap-3"
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span>{project.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {results.length > 0 && (
            <>
              <CommandSeparator />
              {/* Activity Results */}
              {results.filter(r => r.type === 'activity').length > 0 && (
                <CommandGroup heading="Activities">
                  {results
                    .filter(r => r.type === 'activity')
                    .map(result => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleResultSelect(result)}
                        className="mb-1 flex items-start gap-3"
                      >
                        <div className="mt-1">
                          {result.color ? (
                            <span
                              className="block h-2 w-2 rounded-full"
                              style={{ backgroundColor: result.color }}
                            />
                          ) : (
                            <div className="bg-muted-foreground/30 h-2 w-2 rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="line-clamp-1 text-sm">{result.title}</p>
                          <p className="text-muted-foreground truncate text-xs">
                            {result.subtitle}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}

              {/* Project Results */}
              {displayedResults.filter(r => r.type === 'project').length > 0 && (
                <CommandGroup heading="Projects">
                  {displayedResults
                    .filter(r => r.type === 'project')
                    .map(result => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleResultSelect(result)}
                        className="mb-1 flex items-center gap-3"
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: result.color || '#6366f1' }}
                        />
                        <div className="flex-1">
                          <p className="text-sm">{result.title}</p>
                          <p className="text-muted-foreground text-xs">{result.subtitle}</p>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}

              {/* Contact Results */}
              {displayedResults.filter(r => r.type === 'contact').length > 0 && (
                <CommandGroup heading="Contacts">
                  {displayedResults
                    .filter(r => r.type === 'contact')
                    .map(result => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleResultSelect(result)}
                        className="mb-1 flex items-center gap-3"
                      >
                        <Users className="h-4 w-4" />
                        <div className="flex-1">
                          <p className="text-sm">{result.title}</p>
                          <p className="text-muted-foreground text-xs">{result.subtitle}</p>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}

              {/* Interaction Results */}
              {displayedResults.filter(r => r.type === 'interaction').length > 0 && (
                <CommandGroup heading="Interactions">
                  {displayedResults
                    .filter(r => r.type === 'interaction')
                    .map(result => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleResultSelect(result)}
                        className="mb-1 flex items-center gap-3"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <div className="flex-1">
                          <p className="text-sm">{result.title}</p>
                          <p className="text-muted-foreground text-xs">{result.subtitle}</p>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}

              {/* Report Results */}
              {displayedResults.filter(r => r.type === 'report').length > 0 && (
                <CommandGroup heading="Reports">
                  {displayedResults
                    .filter(r => r.type === 'report')
                    .map(result => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleResultSelect(result)}
                        className="mb-1 flex items-center gap-3"
                      >
                        <FileBarChart className="h-4 w-4" />
                        <div className="flex-1">
                          <p className="text-sm">{result.title}</p>
                          <p className="text-muted-foreground text-xs">{result.subtitle}</p>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
      <ActivityDetailModal
        open={!!selectedActivity}
        onOpenChange={open => !open && setSelectedActivity(null)}
        activity={selectedActivity}
      />
    </>
  );
}

interface ActivityDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: SearchResult | null;
}

function ActivityDetailModal({ open, onOpenChange, activity }: ActivityDetailModalProps) {
  if (!activity) return null;

  let dateDisplay = 'Unknown Date';
  if (activity.createdAt) {
    dateDisplay = format(new Date(activity.createdAt), 'EEEE, MMMM d, yyyy • h:mm a');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between pr-8">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span>{dateDisplay}</span>
            </div>
            {activity.color && activity.subtitle && (
              <Badge
                variant="outline"
                className="bg-background/50 gap-2 px-3 py-1 font-normal backdrop-blur-md"
                style={{ borderColor: activity.color + '40', color: activity.color }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: activity.color }}
                />
                <span className="max-w-[150px] truncate">
                  {activity.subtitle.split(' • ')[0] || 'No Project'}
                </span>
              </Badge>
            )}
          </div>

          <DialogTitle className="sr-only">Activity Detail</DialogTitle>
        </DialogHeader>

        <div className="custom-scrollbar mt-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="prose prose-sm dark:prose-invert text-foreground/90 max-w-none text-lg leading-relaxed whitespace-pre-wrap">
            {activity.fullContent || activity.title}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t pt-4" />
      </DialogContent>
    </Dialog>
  );
}
