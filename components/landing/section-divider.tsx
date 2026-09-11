/**
 * A quiet visual separator for the public page.
 *
 * Why: Decorative dividers should not need client JavaScript, observers, or
 * entrance animation. A stable line keeps the landing page available on the
 * first paint and avoids adding another motion system to the page.
 */
import { cn } from '@/lib/utils';

interface SectionDividerProps {
  className?: string;
  maxWidth?: string;
  /** Kept for call-site compatibility; decorative separators do not animate. */
  delay?: number;
  glow?: boolean;
}

const maxWidthClasses: Record<string, string> = {
  'max-w-3xl': 'max-w-3xl',
  'max-w-4xl': 'max-w-4xl',
  'max-w-5xl': 'max-w-5xl',
  'max-w-6xl': 'max-w-6xl',
  'max-w-7xl': 'max-w-7xl',
};

export function SectionDivider({
  className,
  maxWidth = 'max-w-4xl',
  delay: _delay,
  glow = false,
}: SectionDividerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none flex w-full justify-center px-6 py-8 md:py-12', className)}
    >
      <div
        className={cn(
          'bg-border/50 h-px w-full',
          maxWidthClasses[maxWidth] ?? maxWidthClasses['max-w-4xl'],
          glow && 'shadow-primary/20 shadow-[0_0_18px]'
        )}
      />
    </div>
  );
}
