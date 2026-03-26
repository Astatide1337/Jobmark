import Link from 'next/link';
import type { Metadata } from 'next';
import { StoryCard } from '@/components/content/story-card';
import { getAllArticles } from '@/lib/articles';
import { TopicChipsBar, SortAndSearchBar } from './_components/article-filters';

const categoryLabels = {
  all: 'All',
  help: 'Help',
  'career-development': 'Career Development',
} as const;

type CategoryFilter = keyof typeof categoryLabels;

const validCategories = new Set<CategoryFilter>(['all', 'help', 'career-development']);

export const metadata: Metadata = {
  title: 'Articles | Jobmark',
  description:
    'Browse practical articles for Jobmark and career development playbooks to improve reviews, promotions, and long-term growth.',
  openGraph: {
    title: 'Articles | Jobmark',
    description:
      'Browse practical articles for Jobmark and career development playbooks to improve reviews, promotions, and long-term growth.',
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

  const leadArticle = filteredArticles.find(article => article.featured) ?? filteredArticles[0];
  const useShelfFirstLayout = Boolean(query) || topic !== 'all' || filteredArticles.length <= 4;
  const remainingArticles = leadArticle
    ? filteredArticles.filter(article => article.slug !== leadArticle.slug)
    : filteredArticles;
  const secondaryArticles = useShelfFirstLayout ? [] : remainingArticles.slice(0, 3);
  const displayedSlugs = new Set([
    ...(leadArticle ? [leadArticle.slug] : []),
    ...secondaryArticles.map(article => article.slug),
  ]);
  const shelfArticles = filteredArticles.filter(article => !displayedSlugs.has(article.slug));

  const sectioned = [
    {
      key: 'build-record',
      title: 'Build Your Record',
      description: 'Capture better evidence so future reviews do not rely on memory.',
      items: shelfArticles
        .filter(
          article =>
            article.tags.includes('accomplishments') ||
            article.tags.includes('weekly-routine') ||
            article.tags.includes('planning')
        )
        .slice(0, 4),
    },
    {
      key: 'reviews',
      title: 'Write Better Reviews',
      description: 'Turn your work into clear summaries, self-reviews, and promotion material.',
      items: shelfArticles
        .filter(
          article =>
            article.tags.includes('performance-review') ||
            article.tags.includes('promotion') ||
            article.tags.includes('impact')
        )
        .slice(0, 4),
    },
    {
      key: 'visibility',
      title: 'Improve Career Visibility',
      description: 'Use communication, networking, and consistent follow-through to stay visible.',
      items: shelfArticles
        .filter(
          article =>
            article.tags.includes('networking') ||
            article.tags.includes('relationships') ||
            article.tags.includes('career-growth')
        )
        .slice(0, 4),
    },
  ].filter(section => section.items.length > 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="border-border/60 border-b pb-6 sm:pb-8">
        <p className="text-muted-foreground text-sm">Practical Articles</p>
        <h1 className="text-foreground mt-2 font-serif text-3xl leading-tight font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          Practical articles for building a stronger work record
        </h1>
        <p className="text-muted-foreground mt-4 max-w-3xl text-sm sm:text-base">
          Read practical playbooks that help you capture better evidence, write clearer updates,
          and prepare stronger reviews inside Jobmark.
        </p>
      </section>

      <TopicChipsBar
        categories={categoryLabels}
        activeTopic={topic}
        query={query || undefined}
        sort={sort}
      />

      <SortAndSearchBar topic={topic} query={query} sort={sort} />

      <section className="border-border/60 bg-card/35 rounded-2xl border p-4 sm:p-5">
        <p className="text-primary text-[11px] tracking-[0.16em] uppercase">How To Use This Desk</p>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Pick the problem you want to solve next, read one article, then apply a single action in
          Jobmark before moving on.
        </p>
      </section>

      {filteredArticles.length === 0 ? (
        <p className="text-muted-foreground text-sm">No articles matched your filters.</p>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-8">
            {leadArticle ? <StoryCard article={leadArticle} variant="lead" /> : null}

            {secondaryArticles.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {secondaryArticles.map(article => (
                  <StoryCard key={article.slug} article={article} />
                ))}
              </div>
            ) : null}

            {sectioned.map(section => (
              <section
                key={section.key}
                className="border-border/60 bg-card/40 rounded-2xl border p-5 sm:p-6"
              >
                <div className="border-border/50 mb-4 border-b pb-3">
                  <h2 className="text-foreground font-serif text-2xl font-semibold">
                    {section.title}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">{section.description}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {section.items.map(article => (
                    <StoryCard key={article.slug} article={article} variant="compact" />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <section className="border-border/60 bg-card/45 rounded-2xl border p-5">
              <p className="text-foreground font-serif text-lg leading-snug font-semibold">
                Reading should end in action.
              </p>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                Use one article to improve how you capture work, then take the next step immediately
                in Jobmark.
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <Link href="/dashboard" className="text-primary inline-flex font-medium hover:underline">
                  Open dashboard
                </Link>
                <Link href="/reports?tab=new" className="text-primary block font-medium hover:underline">
                  Build a summary
                </Link>
                <Link href="/chat" className="text-primary block font-medium hover:underline">
                  Open coach
                </Link>
              </div>
            </section>
          </aside>
        </section>
      )}
    </div>
  );
}
