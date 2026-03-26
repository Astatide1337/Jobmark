'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpDown } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TopicChipsBarProps<TCategory extends string> {
  categories: Record<TCategory, string>;
  activeTopic: TCategory;
  query?: string;
  sort?: string;
}

export function TopicChipsBar<TCategory extends string>({
  categories,
  activeTopic,
  query,
  sort,
}: TopicChipsBarProps<TCategory>) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.entries(categories) as Array<[TCategory, string]>).map(([value, label]) => {
        const isActive = activeTopic === value;
        const params = new URLSearchParams();

        if (value !== 'all') {
          params.set('topic', value);
        }

        if (query) {
          params.set('q', query);
        }

        if (sort && sort !== 'newest') {
          params.set('sort', sort);
        }

        const href = params.size > 0 ? `/articles?${params.toString()}` : '/articles';

        return (
          <Link
            key={value}
            href={href}
            className={cn(
              buttonVariants({ variant: isActive ? 'default' : 'outline', size: 'sm' }),
              'rounded-xl',
              isActive ? 'shadow-primary/10' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

interface SortAndSearchBarProps {
  topic: string;
  query: string;
  sort: string;
}

export function SortAndSearchBar({ topic, query, sort }: SortAndSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [queryValue, setQueryValue] = useState(query);
  const [sortValue, setSortValue] = useState(sort);

  useEffect(() => {
    setQueryValue(query);
  }, [query]);

  useEffect(() => {
    setSortValue(sort);
  }, [sort]);

  const applyFilters = useCallback(
    (nextQuery: string, nextSort: string) => {
      const params = new URLSearchParams();

      if (topic !== 'all') {
        params.set('topic', topic);
      }

      const trimmedQuery = nextQuery.trim();
      if (trimmedQuery) {
        params.set('q', trimmedQuery);
      }

      if (nextSort !== 'newest') {
        params.set('sort', nextSort);
      }

      const nextUrl = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, topic]
  );

  useEffect(() => {
    if (queryValue.trim() === query.trim()) {
      return;
    }

    const timeout = window.setTimeout(() => {
      applyFilters(queryValue, sortValue);
    }, 240);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [applyFilters, query, queryValue, sortValue]);

  const sortLabel = useMemo(() => {
    if (sortValue === 'oldest') return 'Oldest';
    if (sortValue === 'title') return 'Title A-Z';
    return 'Newest';
  }, [sortValue]);

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        applyFilters(queryValue, sortValue);
      }}
      className="border-border/60 bg-background/90 sticky top-2 z-20 flex flex-col gap-3 rounded-2xl border p-3 backdrop-blur sm:flex-row sm:items-center"
    >
      <Input
        type="search"
        value={queryValue}
        onChange={event => setQueryValue(event.target.value)}
        placeholder="Search articles by problem or workflow"
        className="h-10 w-full"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-10 shrink-0 gap-2">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sort by:</span>
            <span className="font-medium">{sortLabel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setSortValue('newest');
              applyFilters(queryValue, 'newest');
            }}
          >
            Newest
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSortValue('oldest');
              applyFilters(queryValue, 'oldest');
            }}
          >
            Oldest
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSortValue('title');
              applyFilters(queryValue, 'title');
            }}
          >
            Title A-Z
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button type="submit" className="sr-only" aria-hidden="true" tabIndex={-1}>
        Submit filters
      </button>
    </form>
  );
}
