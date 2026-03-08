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
    'Browse practical guides for Jobmark and career development playbooks to improve reviews, promotions, and long-term growth.',
  openGraph: {
    title: 'Articles | Jobmark',
    description:
      'Browse practical guides for Jobmark and career development playbooks to improve reviews, promotions, and long-term growth.',
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
  const remainingArticles = leadArticle
    ? filteredArticles.filter(article => article.slug !== leadArticle.slug)
    : filteredArticles;
  const secondaryArticles = remainingArticles.slice(0, 3);
  const sectionArticles = remainingArticles.slice(3);

  const sectioned = [
    {
      key: 'career-development',
      title: 'Career Development Desk',
      description: 'Playbooks for promotion trajectories and long-term growth.',
      items: sectionArticles
        .filter(article => article.category === 'career-development')
        .slice(0, 4),
    },
    {
      key: 'help',
      title: 'Jobmark Help Desk',
      description: 'Practical workflows to log wins, build reports, and stay consistent.',
      items: sectionArticles.filter(article => article.category === 'help').slice(0, 4),
    },
  ].filter(section => section.items.length > 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="border-border/60 border-b pb-6 sm:pb-8">
        <p className="text-muted-foreground text-sm">Jobmark Editorial Desk</p>
        <h1 className="text-foreground mt-2 font-serif text-3xl leading-tight font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          Career journalism for your next review cycle
        </h1>
        <p className="text-muted-foreground mt-4 max-w-3xl text-sm sm:text-base">
          Read practical guides that help you capture evidence, communicate impact, and stay
          visible. Built for people who want stronger reviews and faster promotion momentum.
        </p>
      </section>

      <TopicChipsBar
        categories={categoryLabels}
        activeTopic={topic}
        query={query || undefined}
        sort={sort}
      />

      <SortAndSearchBar topic={topic} query={query} sort={sort} />

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
                Build your promotion narrative as you read.
              </p>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                Pick one idea from an article and apply it immediately in Jobmark by logging a win,
                updating a goal, or drafting a review summary.
              </p>
              <Link
                href="/dashboard"
                className="text-primary mt-4 inline-flex text-sm font-medium hover:underline"
              >
                Open Jobmark dashboard
              </Link>
            </section>
          </aside>
        </section>
      )}
    </div>
  );
}
