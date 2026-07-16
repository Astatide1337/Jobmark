import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Calendar } from '@/components/ui/calendar';

describe('Calendar', () => {
  it('renders the react-day-picker v9 structure with accessible navigation', () => {
    const html = renderToStaticMarkup(
      <Calendar mode="single" defaultMonth={new Date(2026, 6, 1)} />
    );

    expect(html).toContain('grid grid-cols-7');
    expect(html).toContain('mt-1 grid grid-cols-7');
    expect(html).toContain('size-4 fill-current');
    expect(html).toContain('<svg');
    expect(html).toMatch(/aria-label="[^"]*previous month[^"]*"/i);
    expect(html).toMatch(/aria-label="[^"]*next month[^"]*"/i);
  });
});
