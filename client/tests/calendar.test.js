import { describe, it, expect } from 'vitest';
import { toDateText } from '../src/utils/date.js';
import { getMonthGrid, layoutWeek } from '../src/plan/calendar.js';

describe('calendar', () => {
  it('builds Sunday-first month grids', () => {
    const nov = getMonthGrid(2026, 10); // 2026년 11월: 1일이 일요일, 30일
    expect(nov).toHaveLength(5);
    expect(toDateText(nov[0][0])).toBe('2026-11-01');
    expect(toDateText(nov[4][6])).toBe('2026-12-05');
    const aug = getMonthGrid(2026, 7); // 2026년 8월: 1일 토요일, 31일 → 6주
    expect(aug).toHaveLength(6);
    expect(toDateText(aug[0][0])).toBe('2026-07-26');
  });

  it('lays out range bars in non-overlapping lanes per week', () => {
    const week = getMonthGrid(2026, 10)[3]; // 11/22(일) ~ 11/28(토)
    const ranges = [
      { id: 'a', title: '수학', start: '2026-11-20', end: '2026-12-05' },
      { id: 'b', title: '국어', start: '2026-11-23', end: '2026-11-24' },
      { id: 'c', title: '영어', start: '2026-11-26', end: '2026-11-27' },
      { id: 'd', title: '탐구', start: '2026-11-24', end: '2026-11-26' },
      { id: 'e', title: '밖', start: '2026-12-10', end: '2026-12-11' }
    ];
    const seg = Object.fromEntries(layoutWeek(ranges, week).map((s) => [s.range.id, [s.lane, s.from, s.to]]));
    expect(seg).toEqual({ a: [0, 0, 6], b: [1, 1, 2], d: [2, 2, 4], c: [1, 4, 5] });
  });
});
