import { describe, it, expect } from 'vitest';
import { parseDate, toDateText } from '../src/utils/date.js';
import { getExam, estimateExamDate, findUpcomingAcademicYear, getDefaultAcademicYear, getSelectableYears, YEARS_AHEAD } from '../src/exam/examDates.js';

describe('exam dates', () => {
  it('uses official dates when announced', () => {
    const exam = getExam(2027);
    expect(exam.official).toBe(true);
    expect(toDateText(exam.date)).toBe('2026-11-19');
  });

  it('estimates the third Thursday of November otherwise', () => {
    expect(toDateText(estimateExamDate(2027))).toBe('2027-11-18');
    expect(toDateText(estimateExamDate(2036))).toBe('2036-11-20');
    expect(getExam(2028).official).toBe(false);
  });

  it('treats exam day itself as upcoming', () => {
    expect(findUpcomingAcademicYear(parseDate('2026-11-19'))).toBe(2027);
    expect(findUpcomingAcademicYear(parseDate('2026-11-20'))).toBe(2028);
  });

  it(`offers the upcoming exam through ${YEARS_AHEAD} years later`, () => {
    const years = getSelectableYears(parseDate('2026-11-20'));
    expect(years[0]).toBe(2028);
    expect(years.at(-1)).toBe(2028 + YEARS_AHEAD);
  });

  it('defaults to next year\'s exam on exam day', () => {
    expect(getDefaultAcademicYear(parseDate('2026-11-19'))).toBe(2028);
    expect(getDefaultAcademicYear(parseDate('2026-11-18'))).toBe(2027);
    const years = getSelectableYears(parseDate('2026-11-19'));
    expect(years[0]).toBe(2027);
    expect(years.at(-1)).toBe(2028 + YEARS_AHEAD);
  });
});
