import type { ArticleSummary } from '@/lib/articles';
import { cn } from '@/lib/utils';

const palettes = [
  {
    surface: 'from-[#d98b61] via-[#c97854] to-[#9f503f]',
    ink: 'text-[#2a1715]',
    shape: 'bg-[#f4d7b5]/80',
  },
  {
    surface: 'from-[#b6a26e] via-[#8f9560] to-[#657351]',
    ink: 'text-[#172018]',
    shape: 'bg-[#e7e4c6]/75',
  },
  {
    surface: 'from-[#7d9dbb] via-[#6486aa] to-[#4b647f]',
    ink: 'text-[#101c2a]',
    shape: 'bg-[#e0edf0]/75',
  },
  {
    surface: 'from-[#c6a0be] via-[#9b83ad] to-[#726a99]',
    ink: 'text-[#20162c]',
    shape: 'bg-[#f0deec]/75',
  },
  {
    surface: 'from-[#e1b995] via-[#d99b7d] to-[#b87862]',
    ink: 'text-[#2a1715]',
    shape: 'bg-[#fff0dc]/75',
  },
] as const;

function paletteFor(article: Pick<ArticleSummary, 'slug' | 'category'>) {
  const seed = `${article.slug}:${article.category}`;
  const value = [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return palettes[value % palettes.length];
}

function categoryLabel(category: ArticleSummary['category']) {
  return category === 'help' ? 'Help' : 'Career development';
}

interface ArticleArtworkProps {
  article: Pick<ArticleSummary, 'slug' | 'category' | 'coverImage'>;
  className?: string;
  compact?: boolean;
}

export function ArticleArtwork({ article, className, compact = false }: ArticleArtworkProps) {
  const palette = paletteFor(article);

  if (article.coverImage) {
    return (
      <div
        className={cn(
          'relative overflow-hidden bg-cover bg-center',
          compact ? 'h-24' : 'min-h-56 sm:min-h-72',
          className
        )}
        style={{ backgroundImage: `url(${article.coverImage})` }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden bg-gradient-to-br',
        palette.surface,
        compact ? 'h-24' : 'min-h-56 sm:min-h-72',
        className
      )}
      aria-hidden="true"
    >
      <div
        className={cn(
          'absolute -top-16 -right-12 h-48 w-48 rounded-full blur-[1px]',
          palette.shape
        )}
      />
      <div
        className={cn(
          'absolute -bottom-12 -left-10 h-40 w-64 -rotate-12 rounded-[40%] border-2 border-current/20',
          palette.ink
        )}
      />
      <div
        className={cn(
          'absolute top-[28%] left-[18%] h-24 w-24 rotate-12 rounded-[38%] border-2 border-current/25',
          palette.ink
        )}
      />
      <div
        className={cn('absolute inset-x-5 bottom-4 flex items-end justify-between', palette.ink)}
      >
        <span className="max-w-[10rem] text-[10px] font-semibold tracking-[0.18em] uppercase opacity-80">
          {categoryLabel(article.category)}
        </span>
        <span className="font-serif text-5xl leading-none opacity-75 sm:text-7xl">J</span>
      </div>
    </div>
  );
}
