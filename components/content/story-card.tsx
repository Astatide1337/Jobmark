import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { ArticleSummary } from '@/lib/articles';
import { cn, dateUtils } from '@/lib/utils';

interface StoryCardProps {
  article: ArticleSummary;
  variant?: 'lead' | 'standard' | 'compact' | 'rail';
  className?: string;
}

function categoryLabel(category: ArticleSummary['category']) {
  return category === 'help' ? 'Help' : 'Career Development';
}

function difficultyLabel(difficulty?: ArticleSummary['difficulty']) {
  if (difficulty === 'advanced') return 'Advanced';
  if (difficulty === 'intermediate') return 'Intermediate';
  return 'Starter';
}

export function StoryCard({ article, variant = 'standard', className }: StoryCardProps) {
  const baseClasses =
    'group rounded-2xl border border-border/60 bg-card/65 transition duration-300 hover:border-primary/50 hover:bg-card/80';

  if (variant === 'compact') {
    return (
      <article className={cn(baseClasses, 'p-4', className)}>
        <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs">
          <span>{categoryLabel(article.category)}</span>
          <span className="text-border">/</span>
          <span>{difficultyLabel(article.difficulty)}</span>
          <span className="text-border">/</span>
          <span>{dateUtils.format(article.publishedAt)}</span>
        </div>
        <h3 className="text-foreground group-hover:text-primary font-serif text-base leading-tight font-semibold">
          <Link href={`/articles/${article.slug}`}>{article.title}</Link>
        </h3>
        {article.bestFor ? (
          <p className="text-muted-foreground mt-2 text-xs">Best for {article.bestFor}</p>
        ) : null}
      </article>
    );
  }

  if (variant === 'rail') {
    return (
      <article className={cn(baseClasses, 'p-4', className)}>
        <h3 className="text-foreground group-hover:text-primary font-serif text-base leading-tight font-semibold">
          <Link href={`/articles/${article.slug}`}>{article.title}</Link>
        </h3>
        <p className="text-muted-foreground mt-2 text-sm">{article.description}</p>
        <p className="text-muted-foreground mt-3 text-xs">
          {difficultyLabel(article.difficulty)} / {article.readingTimeMinutes} min read
        </p>
      </article>
    );
  }

  if (variant === 'lead') {
    return (
      <article className={cn(baseClasses, 'p-6 sm:p-8', className)}>
        <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline">{categoryLabel(article.category)}</Badge>
          <Badge variant="outline">{difficultyLabel(article.difficulty)}</Badge>
          <span>{dateUtils.format(article.publishedAt)}</span>
          <span>{article.readingTimeMinutes} min read</span>
        </div>

        <h2 className="text-foreground font-serif text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          <Link href={`/articles/${article.slug}`} className="group-hover:text-primary">
            {article.title}
          </Link>
        </h2>

        <p className="text-muted-foreground mt-4 max-w-2xl text-base">{article.description}</p>
        {article.bestFor ? (
          <p className="text-primary mt-4 text-sm font-medium">Best for {article.bestFor}</p>
        ) : null}
      </article>
    );
  }

  return (
    <article className={cn(baseClasses, 'p-5', className)}>
      <div className="text-muted-foreground mb-3 flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">{categoryLabel(article.category)}</Badge>
        <Badge variant="outline">{difficultyLabel(article.difficulty)}</Badge>
        <span>{dateUtils.format(article.publishedAt)}</span>
        <span>{article.readingTimeMinutes} min read</span>
      </div>

      <h3 className="text-foreground group-hover:text-primary font-serif text-xl leading-tight font-semibold">
        <Link href={`/articles/${article.slug}`}>{article.title}</Link>
      </h3>

      <p className="text-muted-foreground mt-3 text-sm">{article.description}</p>
      {article.bestFor ? (
        <p className="text-primary mt-3 text-xs font-medium">Best for {article.bestFor}</p>
      ) : null}
    </article>
  );
}
