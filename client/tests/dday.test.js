import { describe, it, expect } from 'vitest';
import { parseDate } from '../src/utils/date.js';
import { formatDday, getSummary, getCountdown } from '../src/exam/dday.js';

describe('dday', () => {
  it('formats D-Day labels', () => {
    expect(formatDday(30)).toBe('D-30');
    expect(formatDday(0)).toBe('D-DAY');
    expect(formatDday(-2)).toBe('D+2');
  });

  it('summarizes remaining time and progress', () => {
    const s = getSummary(parseDate('2027-05-19'), parseDate('2027-11-18'), parseDate('2026-11-19'));
    expect(s.diff).toBe(183);
    expect(s.weeks).toBe(26);
    expect(s.progress).toBeGreaterThan(49);
    expect(s.progress).toBeLessThan(51);
    expect(getSummary(parseDate('2027-05-19'), parseDate('2027-06-04')).progress).toBeNull();
  });

  it('counts down to 08:40 on exam day and stops at zero', () => {
    expect(getCountdown(new Date(2027, 10, 17, 8, 39, 0), parseDate('2027-11-18')))
      .toEqual({ days: 1, hours: 0, minutes: 1, seconds: 0 });
    expect(getCountdown(new Date(2027, 10, 18, 9, 0), parseDate('2027-11-18')))
      .toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});
