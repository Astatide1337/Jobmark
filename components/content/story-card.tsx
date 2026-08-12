import Link from 'next/link';
import type { ArticleSummary } from '@/lib/articles';
import { cn, dateUtils } from '@/lib/utils';
import { ArticleArtwork } from './article-artwork';

interface StoryCardProps {
  article: ArticleSummary;
  variant?: 'lead' | 'standard' | 'compact' | 'rail';
  className?: string;
}

function categoryLabel(category: ArticleSummary['category']) {
  return category === 'help' ? 'Help' : 'Career development';
}

export function StoryCard({ article, variant = 'standard', className }: StoryCardProps) {
  const baseClasses =
    'group overflow-hidden rounded-2xl border border-border/70 bg-card/55 transition duration-300 hover:-translate-y-0.5 hover:border-primary/55 hover:bg-card/80';

  if (variant === 'compact') {
    return (
      <Link
        href={`/articles/${article.slug}`}
        className={cn(
          'group border-border/70 hover:border-primary/50 flex min-h-28 items-stretch border-b transition',
          className
        )}
      >
        <ArticleArtwork article={article} compact className="hidden w-28 shrink-0 sm:block" />
        <div className="flex min-w-0 flex-1 flex-col justify-center px-0 py-4 sm:px-5">
          <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs">
            <span>{categoryLabel(article.category)}</span>
            <span className="text-border">/</span>
            <span>{dateUtils.format(article.publishedAt)}</span>
          </div>
          <h3 className="text-foreground group-hover:text-primary font-serif text-lg leading-tight font-semibold transition-colors">
            {article.title}
          </h3>
        </div>
      </Link>
    );
  }

  if (variant === 'rail') {
    return (
      <Link href={`/articles/${article.slug}`} className={cn(baseClasses, 'block', className)}>
        <ArticleArtwork article={article} compact />
        <div className="p-4">
          <h3 className="text-foreground group-hover:text-primary font-serif text-base leading-tight font-semibold transition-colors">
            {article.title}
          </h3>
          <p className="text-muted-foreground mt-2 text-sm">{article.description}</p>
          <p className="text-muted-foreground mt-3 text-xs">
            {categoryLabel(article.category)} / {article.readingTimeMinutes} min read
          </p>
        </div>
      </Link>
    );
  }

  if (variant === 'lead') {
    return (
      <Link
        href={`/articles/${article.slug}`}
        className={cn(
          'group border-border/70 bg-card/60 hover:border-primary/55 grid overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-0.5 lg:grid-cols-[1.08fr_0.92fr]',
          className
        )}
      >
        <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-12">
          <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span>{categoryLabel(article.category)}</span>
            <span className="text-border">/</span>
            <span>{dateUtils.format(article.publishedAt)}</span>
          </div>

          <h2 className="text-foreground group-hover:text-primary max-w-2xl font-serif text-3xl leading-[1.04] font-semibold tracking-tight transition-colors sm:text-4xl lg:text-5xl">
            {article.title}
          </h2>

          <p className="text-muted-foreground mt-5 max-w-xl text-base leading-7 sm:text-lg">
            {article.description}
          </p>

          <p className="text-muted-foreground mt-7 text-xs">
            {article.readingTimeMinutes} min read{' '}
            <span
              aria-hidden="true"
              className="text-primary transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </p>
        </div>
        <ArticleArtwork article={article} className="min-h-64 lg:min-h-full" />
      </Link>
    );
  }

  return (
    <Link href={`/articles/${article.slug}`} className={cn(baseClasses, 'block', className)}>
      <ArticleArtwork article={article} />
      <div className="p-5 sm:p-6">
        <div className="text-muted-foreground mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span>{dateUtils.format(article.publishedAt)}</span>
          <span className="text-border">/</span>
          <span>{categoryLabel(article.category)}</span>
        </div>

        <h3 className="text-foreground group-hover:text-primary font-serif text-xl leading-tight font-semibold transition-colors sm:text-2xl">
          {article.title}
        </h3>

        <p className="text-muted-foreground mt-3 text-sm leading-6">{article.description}</p>
        <p className="text-muted-foreground mt-5 text-xs">
          {article.readingTimeMinutes} min read{' '}
          <span
            aria-hidden="true"
            className="text-primary transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        </p>
      </div>
    </Link>
  );
}
