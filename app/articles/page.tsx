import Link from 'next/link';
import type { Metadata } from 'next';
import { StoryCard } from '@/components/content/story-card';
import { getAllArticles } from '@/lib/articles';
import { TopicChipsBar, SortAndSearchBar } from './_components/article-filters';

const categoryLabels = {
  all: 'All stories',
  help: 'How to use Jobmark',
  'career-development': 'Career development',
} as const;

type CategoryFilter = keyof typeof categoryLabels;

const validCategories = new Set<CategoryFilter>(['all', 'help', 'career-development']);

export const metadata: Metadata = {
  title: 'Articles | Jobmark',
  description:
    'Ideas and practical guides for keeping a clear record of your work and making your next career move.',
  openGraph: {
    title: 'Articles | Jobmark',
    description:
      'Ideas and practical guides for keeping a clear record of your work and making your next career move.',
    type: 'website',
  },
};

interface ArticlesPageProps {
  searchParams: Promise<{ topic?: string; q?: string; sort?: string }>;
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const params = await searchParams;
  const rawTopic = params.topic ?? 'all';
  const topic = validCategories.has(rawTopic as CategoryFilter)
    ? (rawTopic as CategoryFilter)
    : 'all';
  const query = params.q?.trim().toLowerCase() ?? '';
  const sort = params.sort ?? 'newest';

  const allArticles = await getAllArticles();
  const filteredByTopic =
    topic === 'all' ? allArticles : allArticles.filter(article => article.category === topic);

  const searchedArticles = query
    ? filteredByTopic.filter(article => {
        const haystack =
          `${article.title} ${article.description} ${article.tags.join(' ')}`.toLowerCase();
        return haystack.includes(query);
      })
    : filteredByTopic;

  const filteredArticles = [...searchedArticles].sort((a, b) => {
    if (sort === 'oldest') {
      return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
    }

    if (sort === 'title') {
      return a.title.localeCompare(b.title);
    }

    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  const isBrowsingResults = Boolean(query) || topic !== 'all' || sort !== 'newest';
  const featuredArticle = !isBrowsingResults
    ? (filteredArticles.find(article => article.slug === 'build-a-promotion-case-with-evidence') ??
      filteredArticles.find(article => article.featured) ??
      filteredArticles[0])
    : undefined;
  const gridArticles = featuredArticle
    ? filteredArticles.filter(article => article.slug !== featuredArticle.slug)
    : filteredArticles;

  return (
    <div className="pb-12 sm:pb-20">
      <header className="border-border/60 border-b pb-10 sm:pb-14">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-end">
          <div>
            <p className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
              The Jobmark journal
            </p>
            <p className="text-muted-foreground mt-4 max-w-xs text-sm leading-6">
              Practical ideas for people doing thoughtful work and trying to make it visible.
            </p>
          </div>
          <div>
            <h1 className="text-foreground max-w-4xl font-serif text-4xl leading-[0.98] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
              Keep the work. Make the next move clearer.
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-7 sm:text-lg">
              Notes on capturing what changed, telling a stronger story, and building a career on
              more than memory.
            </p>
          </div>
        </div>

        <nav aria-label="Article topics" className="mt-10 overflow-x-auto">
          <div className="flex min-w-max items-center gap-6 sm:gap-9">
            {(
              [
                ['career-development', 'Work and growth'],
                ['help', 'Using Jobmark'],
              ] as const
            ).map(([hrefTopic, label]) => (
              <Link
                key={hrefTopic}
                href={`/articles?topic=${hrefTopic}`}
                className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-2 font-serif text-xl transition-colors sm:text-2xl"
              >
                {label}
                <span
                  className="text-primary text-base transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <div className="pt-8 sm:pt-10">
        {!isBrowsingResults && featuredArticle ? (
          <section aria-labelledby="featured-story-heading">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2
                id="featured-story-heading"
                className="text-foreground font-serif text-2xl font-semibold"
              >
                Featured story
              </h2>
              <Link
                href="/articles?sort=newest"
                className="text-muted-foreground hover:text-primary text-sm transition-colors"
              >
                Browse all <span aria-hidden="true">→</span>
              </Link>
            </div>
            <StoryCard article={featuredArticle} variant="lead" />
          </section>
        ) : null}

        <section
          className={featuredArticle ? 'mt-14 sm:mt-20' : undefined}
          aria-labelledby="article-library-heading"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
                {isBrowsingResults ? 'Filtered stories' : 'From the journal'}
              </p>
              <h2
                id="article-library-heading"
                className="text-foreground mt-2 font-serif text-3xl font-semibold sm:text-4xl"
              >
                {isBrowsingResults ? `${filteredArticles.length} stories` : 'Latest stories'}
              </h2>
            </div>
            <p className="text-muted-foreground text-sm">
              {filteredArticles.length} {filteredArticles.length === 1 ? 'story' : 'stories'}
            </p>
          </div>

          <div className="border-border/70 border-y py-4">
            <TopicChipsBar
              categories={categoryLabels}
              activeTopic={topic}
              query={query || undefined}
              sort={sort}
            />
            <SortAndSearchBar topic={topic} query={query} sort={sort} />
          </div>

          {filteredArticles.length === 0 ? (
            <section className="border-border/70 mt-8 rounded-2xl border border-dashed p-8 text-center sm:p-12">
              <h3 className="text-foreground font-serif text-2xl font-semibold">
                No stories matched that search.
              </h3>
              <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">
                Try a different phrase or return to the full journal.
              </p>
              <Link
                href="/articles"
                className="text-primary mt-5 inline-flex text-sm font-medium hover:underline"
              >
                Clear filters
              </Link>
            </section>
          ) : (
            <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {gridArticles.map(article => (
                <StoryCard key={article.slug} article={article} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
