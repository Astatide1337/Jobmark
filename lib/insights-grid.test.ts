import { describe, expect, it } from 'vitest';
import { buildHeatmapGrid } from '@/lib/insights-grid';

describe('buildHeatmapGrid', () => {
  it('keeps weekday alignment and month labels on one canonical grid', () => {
    const result = buildHeatmapGrid([{ date: '2026-08-03', count: 2 }], '2026-08-02', '2026-08-08');

    expect(result.heatmapGrid).toHaveLength(1);
    expect(result.heatmapGrid[0]).toHaveLength(7);
    expect(result.heatmapGrid[0][0]).toMatchObject({ date: '2026-08-02', dayOfWeek: 0 });
    expect(result.heatmapGrid[0][1]).toMatchObject({ date: '2026-08-03', count: 2 });
    expect(result.monthLabels).toEqual([{ month: 'Aug', weekIndex: 0 }]);
  });

  it('pads a partial first week without changing the date values', () => {
    const result = buildHeatmapGrid([], '2026-08-05', '2026-08-07');
    const week = result.heatmapGrid[0];

    expect(week).toHaveLength(7);
    expect(week.slice(0, 3)).toEqual([
      { date: '', count: -1, dayOfWeek: 0 },
      { date: '', count: -1, dayOfWeek: 1 },
      { date: '', count: -1, dayOfWeek: 2 },
    ]);
    expect(week[3].date).toBe('2026-08-05');
  });
});
