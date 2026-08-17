import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}: SectionHeadingProps) {
  const centered = align === 'center';

  return (
    <div
      className={cn(
        'max-w-3xl',
        centered && 'mx-auto text-center',
        className
      )}
    >
      <div className={cn('mb-5 flex items-center gap-3', centered && 'justify-center')}>
        <div className="bg-primary/50 h-px w-10" />
        <span className="text-primary font-mono text-xs font-medium tracking-[0.14em] uppercase sm:text-sm">
          {eyebrow}
        </span>
        {centered ? <div className="bg-primary/50 h-px w-10" /> : null}
      </div>
      <h2 className="font-serif text-3xl leading-tight font-bold tracking-tight sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="text-muted-foreground mt-5 text-base leading-relaxed sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
