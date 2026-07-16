/**
 * Date Picker Calendar
 *
 * Why: Shared calendar primitive for activity dates, report ranges, and goal
 * deadlines. The class-name map targets react-day-picker v9's UI API.
 */
'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('relative w-fit p-3', className)}
      classNames={{
        months: 'flex flex-col gap-4 sm:flex-row',
        month: 'space-y-3',
        month_caption: 'relative flex h-9 items-center justify-center px-10',
        caption_label: 'text-sm font-medium',
        nav: 'absolute inset-x-3 top-3 flex items-center justify-between',
        button_previous: cn(
          buttonVariants({ variant: 'outline', size: 'icon-sm' }),
          'bg-transparent opacity-70 hover:opacity-100'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline', size: 'icon-sm' }),
          'bg-transparent opacity-70 hover:opacity-100'
        ),
        chevron: 'size-4 fill-current',
        month_grid: 'w-full border-collapse',
        weekdays: 'grid grid-cols-7',
        weekday:
          'text-muted-foreground flex size-9 items-center justify-center text-[0.8rem] font-normal',
        weeks: 'block',
        week: 'mt-1 grid grid-cols-7',
        day: 'relative size-9 p-0 text-center text-sm focus-within:z-20',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-9 p-0 font-normal text-foreground aria-selected:opacity-100'
        ),
        range_start: 'rounded-l-xl [&>button]:rounded-l-xl',
        range_end: 'rounded-r-xl [&>button]:rounded-r-xl',
        range_middle:
          'rounded-none !bg-accent/60 [&>button]:rounded-none [&>button]:!bg-accent/60 [&>button]:!text-accent-foreground',
        selected:
          'rounded-xl bg-primary text-primary-foreground [&>button]:bg-primary [&>button]:text-primary-foreground [&>button:hover]:bg-primary/90',
        today: 'rounded-xl border border-border font-bold [&>button]:font-bold',
        outside: 'text-muted-foreground opacity-45 aria-selected:opacity-30',
        disabled: 'text-muted-foreground opacity-40',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
