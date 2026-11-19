import { describe, it, expect } from 'vitest';
import { parseDate, toDateText, daysBetween, countWeekends, formatKoreanDate } from '../src/utils/date.js';

describe('date utils', () => {
  it('parses and formats dates in local time', () => {
    expect(toDateText(parseDate('2027-11-18'))).toBe('2027-11-18');
    expect(formatKoreanDate(parseDate('2027-11-18'))).toBe('2027년 11월 18일 (목)');
  });

  it('counts calendar days regardless of time of day', () => {
    expect(daysBetween(new Date(2026, 10, 19, 23, 59), parseDate('2026-11-20'))).toBe(1);
    expect(daysBetween(parseDate('2026-11-19'), parseDate('2026-11-19'))).toBe(0);
  });

  it('counts remaining weekends by Saturdays', () => {
    // 2026-11-19(목) ~ 2026-12-03(목): 11/21, 11/28
    expect(countWeekends(parseDate('2026-11-19'), parseDate('2026-12-03'))).toBe(2);
  });
});
