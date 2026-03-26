'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { Article, ArticleSummary } from '@/lib/articles';
import { dateUtils } from '@/lib/utils';

function ArticleHeader({ article }: { article: Article }) {
  const categoryLabel = (category: Article['category']) =>
    category === 'help' ? 'Help' : 'Career Development';
  const difficultyLabel = (() => {
    if (article.difficulty === 'advanced') return 'Advanced';
    if (article.difficulty === 'intermediate') return 'Intermediate';
    return 'Starter';
  })();

  const publishedLabel = dateUtils.format(article.publishedAt);
  const updatedLabel = dateUtils.format(article.updatedAt ?? article.publishedAt);
  const hasUpdatedDate = updatedLabel !== publishedLabel;

  return (
    <header className="border-border/60 mb-8 border-b pb-8 sm:mb-10">
      <div className="text-muted-foreground mb-3 flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">{categoryLabel(article.category)}</Badge>
        <Badge variant="outline">{difficultyLabel}</Badge>
        {article.featured ? (
          <Badge className="bg-primary/20 text-primary hover:bg-primary/20">Featured</Badge>
        ) : null}
        {article.series ? <Badge variant="outline">{article.series}</Badge> : null}
      </div>

      <h1 className="text-foreground font-serif text-3xl leading-tight font-semibold tracking-tight sm:text-4xl lg:text-5xl">
        {article.title}
      </h1>

      <p className="text-muted-foreground mt-4 max-w-3xl text-base sm:text-lg">
        {article.description}
      </p>

      {article.bestFor ? (
        <p className="text-primary mt-4 text-sm font-medium">Best for {article.bestFor}</p>
      ) : null}

      <div className="text-muted-foreground mt-5 flex flex-wrap items-center gap-3 text-sm">
        <span>By {article.author}</span>
        <span>Published {publishedLabel}</span>
        {hasUpdatedDate ? <span>Updated {updatedLabel}</span> : null}
        <span>{article.readingTimeMinutes} min read</span>
      </div>
    </header>
  );
}

function HowToUseArticle({ article }: { article: Article }) {
  const nextHref = article.primaryHref ?? '/dashboard';
  const nextAction = article.primaryAction ?? 'Open dashboard';

  return (
    <section className="border-border/60 bg-card/40 mb-8 rounded-2xl border p-5 sm:p-6">
      <p className="text-primary text-[11px] tracking-[0.16em] uppercase">
        How To Use This Article
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-foreground text-sm font-medium">What it helps with</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {article.bestFor
              ? `Getting better at ${article.bestFor.toLowerCase()}.`
              : 'Improving how you capture work and turn it into usable career evidence.'}
          </p>
        </div>
        <div>
          <p className="text-foreground text-sm font-medium">When to read it</p>
          <p className="text-muted-foreground mt-1 text-sm">
            When you want one practical change you can apply immediately inside Jobmark.
          </p>
        </div>
        <div>
          <p className="text-foreground text-sm font-medium">Best next step</p>
          <Link href={nextHref} className="text-primary mt-1 inline-flex text-sm font-medium hover:underline">
            {nextAction}
          </Link>
        </div>
      </div>
    </section>
  );
}

function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const value = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
      setProgress(Math.max(0, Math.min(100, value)));
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateProgress);
    };
  }, []);

  return (
    <div className="bg-border/40 sticky top-0 z-30 h-1 w-full">
      <div
        className="bg-primary h-full transition-[width] duration-150"
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />
    </div>
  );
}

interface CareerSignalCalloutProps {
  article: Article;
}

function CareerSignalCallout({ article }: CareerSignalCalloutProps) {
  const callouts: Record<
    string,
    {
      title: string;
      body: string;
      href: string;
      cta: string;
      secondaryHref: string;
      secondaryCta: string;
    }
  > = {
    default: {
      title: 'Apply this in Jobmark',
      body: 'Turn this article into evidence by capturing one concrete example from your recent work.',
      href: '/dashboard',
      cta: 'Log a recent win',
      secondaryHref: '/reports?tab=new',
      secondaryCta: 'Build a summary',
    },
    checklist: {
      title: 'Apply this in Jobmark',
      body: 'Capture this week while details are still fresh, then turn the strongest entries into a usable summary.',
      href: '/dashboard',
      cta: "Log this week's wins",
      secondaryHref: '/reports?tab=new',
      secondaryCta: 'Draft weekly summary',
    },
  };

  const selected = callouts[article.ctaVariant ?? 'default'] ?? callouts.default;
  const primaryHref = article.primaryHref ?? selected.href;
  const primaryAction = article.primaryAction ?? selected.cta;
  const secondaryHref = article.secondaryHref ?? selected.secondaryHref;
  const secondaryAction = article.secondaryAction ?? selected.secondaryCta;

  return (
    <section className="border-border/60 bg-card/40 my-10 rounded-2xl border p-5 sm:p-6">
      <p className="text-primary text-[11px] tracking-[0.16em] uppercase">Next Step</p>
      <h2 className="text-foreground mt-2 font-serif text-2xl font-semibold">{selected.title}</h2>
      <p className="text-muted-foreground mt-3 max-w-2xl text-sm sm:text-base">{selected.body}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Link
          href={primaryHref}
          className="border-primary/40 bg-primary/20 text-primary hover:bg-primary/25 inline-flex rounded-xl border px-4 py-2 text-sm font-medium transition"
        >
          {primaryAction}
        </Link>
        <Link
          href={secondaryHref}
          className="text-muted-foreground hover:text-primary inline-flex text-sm font-medium transition"
        >
          Or {secondaryAction.toLowerCase()}
        </Link>
      </div>
    </section>
  );
}

interface RelatedStoriesProps {
  articles: ArticleSummary[];
  title?: string;
}

function RelatedStories({ articles, title = 'Continue building this skill' }: RelatedStoriesProps) {
  if (articles.length === 0) {
    return null;
  }

  const cardTones = ['bg-primary/25', 'bg-accent/25', 'bg-secondary/80', 'bg-muted/80', 'bg-card'];

  const categoryLabel = (category: ArticleSummary['category']) =>
    category === 'help' ? 'Help' : 'Career Development';

  return (
    <section className="border-border/60 mt-14 border-t pt-8 sm:pt-10">
      <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-end">
        <h2 className="text-foreground font-serif text-4xl leading-tight font-semibold">{title}</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {articles.map((article, index) => (
          <Link
            key={article.slug}
            href={`/articles/${article.slug}`}
            className="group border-border/60 bg-card/70 hover:border-primary/40 overflow-hidden rounded-2xl border transition"
          >
            <div
              className={`${cardTones[index % cardTones.length]} border-border/60 h-40 border-b`}
            />
            <div className="p-5">
              <p className="text-muted-foreground text-xs">
                {dateUtils.format(article.publishedAt)}
              </p>
              <h3 className="text-foreground group-hover:text-primary mt-3 font-serif text-2xl leading-tight font-semibold">
                {article.title}
              </h3>
              <p className="text-muted-foreground mt-3 text-sm">
                {categoryLabel(article.category)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export { ArticleHeader, ReadingProgress, CareerSignalCallout, RelatedStories };
export { HowToUseArticle };
