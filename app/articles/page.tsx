import Link from 'next/link';
import type { Metadata } from 'next';
import { StoryCard } from '@/components/content/story-card';
import { getAllArticles } from '@/lib/articles';
import { TopicChipsBar, SortAndSearchBar } from './_components/article-filters';

const categoryLabels = {
  all: 'All',
  help: 'How to use Jobmark',
  'career-development': 'Career development',
} as const;

type CategoryFilter = keyof typeof categoryLabels;
const articlesDescription =
  'Practical notes for capturing progress, telling a clearer story, and taking your next step.';

const validCategories = new Set<CategoryFilter>(['all', 'help', 'career-development']);

export const metadata: Metadata = {
  title: 'Articles | Jobmark',
  description: articlesDescription,
  openGraph: {
    title: 'Articles | Jobmark',
    description: articlesDescription,
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
        <div className="max-w-3xl">
          <h1 className="text-foreground max-w-3xl font-serif text-4xl leading-[0.98] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Jobmark Articles
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-7 sm:text-lg">
            {articlesDescription}
          </p>
        </div>
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
            </div>
            <StoryCard article={featuredArticle} variant="lead" />
          </section>
        ) : null}

        <section
          className={featuredArticle ? 'mt-14 sm:mt-20' : undefined}
          aria-labelledby="article-library-heading"
        >
          <div className="mb-6">
            <h2
              id="article-library-heading"
              className="text-foreground font-serif text-3xl font-semibold sm:text-4xl"
            >
              {isBrowsingResults ? `${filteredArticles.length} stories` : 'Latest stories'}
            </h2>
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
