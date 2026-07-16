import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Calendar } from '@/components/ui/calendar';

describe('Calendar', () => {
  it('renders the react-day-picker v9 structure with a seven-column grid', () => {
    const html = renderToStaticMarkup(
      <Calendar mode="single" defaultMonth={new Date(2026, 6, 1)} />
    );

    expect(html).toContain('grid grid-cols-7');
    expect(html).toContain('mt-1 grid grid-cols-7');
    expect(html).toContain('size-4 fill-current');
    expect(html).toContain('aria-label="Go to the Previous Month"');
    expect(html).toContain('aria-label="Go to the Next Month"');
    expect(html).not.toContain('&lt;');
    expect(html).not.toContain('&gt;');
  });
});
