"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  FileText,
  FolderOpen,
  Home,
  Plus,
  Search,
  FileBarChart,
  Sparkles,
} from "lucide-react";
import { ActivityDetailModal } from "@/components/activity/activity-detail-modal";
import { globalSearch, getRecentProjects, type SearchResult } from "@/app/actions/search";

// Quick action definitions
const quickActions = [
  { id: "log", label: "Log New Activity", icon: Plus, action: "focus-capture" },
  { id: "view-reports", label: "View Reports", icon: FileBarChart, href: "/reports?tab=history" },
  { id: "create-report", label: "Create Report", icon: Sparkles, href: "/reports?tab=new" },
  { id: "project", label: "Create Project", icon: FolderOpen, href: "/projects?new=true" },
];

// Navigation items
const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: Home, href: "/dashboard" },
  { id: "projects", label: "Projects", icon: FolderOpen, href: "/projects" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentProjects, setRecentProjects] = useState<{id: string, name: string, color: string}[]>([]);
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
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        const searchResults = await globalSearch(query);
        setResults(searchResults);
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback((item: { href?: string; action?: string }) => {
    setOpen(false);
    setQuery("");
    
    if (item.action === "focus-capture") {
      // Focus the quick capture textarea
      setTimeout(() => {
        const textarea = document.querySelector<HTMLTextAreaElement>('[data-quick-capture="true"]');
        textarea?.focus();
      }, 100);
      return;
    }

    if (item.href) {
      router.push(item.href);
    }
  }, [router]);

  const handleResultSelect = useCallback((result: SearchResult) => {
    setOpen(false);
    setQuery("");
    
    if (result.type === 'activity') {
      setSelectedActivity(result);
      return;
    }

    router.push(result.url);
  }, [router]);

  const isSearching = query.trim().length > 0;

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
      description="Search for activities, projects, reports, or navigate anywhere"
      showCloseButton={false}
      shouldFilter={false} // Disable internal filtering to allow server results (e.g. "today") to show
    >
      <CommandInput
        placeholder="Search everything..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isPending ? "Searching..." : "No results found."}
        </CommandEmpty>

        {filteredQuickActions.length > 0 && (
          <CommandGroup heading="Quick Actions">
            {filteredQuickActions.map((action) => (
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
            {filteredNavigationItems.map((item) => (
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
              {recentProjects.map((project) => (
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
            {results.filter(r => r.type === "activity").length > 0 && (
              <CommandGroup heading="Activities">
                {results
                  .filter((r) => r.type === "activity")
                  .map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleResultSelect(result)}
                        className="flex items-start gap-3 mb-1"
                      >
                      <div className="mt-1">
                        {result.color ? (
                          <span 
                            className="block h-2 w-2 rounded-full" 
                            style={{ backgroundColor: result.color }}
                          />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="line-clamp-1 text-sm">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}

            {/* Project Results */}
            {results.filter(r => r.type === "project").length > 0 && (
              <CommandGroup heading="Projects">
                {results
                  .filter((r) => r.type === "project")
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleResultSelect(result)}
                      className="flex items-center gap-3 mb-1"
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: result.color || "#6366f1" }}
                      />
                      <div className="flex-1">
                        <p className="text-sm">{result.title}</p>
                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}

            {/* Report Results */}
            {results.filter(r => r.type === "report").length > 0 && (
              <CommandGroup heading="Reports">
                {results
                  .filter((r) => r.type === "report")
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleResultSelect(result)}
                      className="flex items-center gap-3 mb-1"
                    >
                      <FileBarChart className="h-4 w-4" />
                      <div className="flex-1">
                        <p className="text-sm">{result.title}</p>
                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
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
      onOpenChange={(open) => !open && setSelectedActivity(null)}
      activity={selectedActivity}
    />
    </>
  );
}
