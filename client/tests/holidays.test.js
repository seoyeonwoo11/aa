import { describe, it, expect } from 'vitest';
import { holidaysOfYear, holidayName } from '../src/plan/holidays.js';

describe('공휴일', () => {
  it('설날·부처님오신날·추석을 음력에 맞춰 넣는다', () => {
    expect(holidayName('2026-02-16')).toBe('설날');
    expect(holidayName('2026-02-17')).toBe('설날');
    expect(holidayName('2026-02-18')).toBe('설날');
    expect(holidayName('2026-05-24')).toBe('부처님오신날');
    expect(holidayName('2026-09-25')).toBe('추석');
    expect(holidayName('2024-09-17')).toBe('추석');
  });

  it('양력 공휴일', () => {
    for (const date of ['2026-01-01', '2026-03-01', '2026-05-05', '2026-06-06', '2026-08-15', '2026-10-03', '2026-10-09', '2026-12-25']) {
      expect(holidayName(date)).not.toBeNull();
    }
    expect(holidayName('2026-11-20')).toBeNull();
  });

  it('2025년 대체공휴일 (실제 달력과 같다)', () => {
    const subs = Object.entries(holidaysOfYear(2025)).filter(([, n]) => n === '대체공휴일').map(([d]) => d);
    expect(subs).toEqual(['2025-03-03', '2025-05-06', '2025-10-08']);
    expect(holidayName('2025-05-05')).toBe('어린이날, 부처님오신날');
  });

  it('2026년 대체공휴일: 토요일 삼일절·광복절·개천절, 일요일 부처님오신날. 토요일 추석은 대체하지 않는다', () => {
    const subs = Object.entries(holidaysOfYear(2026)).filter(([, n]) => n === '대체공휴일').map(([d]) => d);
    expect(subs).toEqual(['2026-03-02', '2026-05-25', '2026-08-17', '2026-10-05']);
  });

  it('설날 연휴가 일요일과 겹치면 연휴 다음 평일, 추석이 개천절과 겹치면 다음 평일', () => {
    expect(holidayName('2027-02-09')).toBe('대체공휴일');
    expect(holidayName('2028-10-03')).toBe('개천절, 추석');
    expect(holidayName('2028-10-05')).toBe('대체공휴일');
  });

  it('신정·현충일은 주말이어도 대체하지 않는다', () => {
    // 2028-01-01은 토요일, 2027-06-06은 일요일
    expect(holidayName('2028-01-03')).toBeNull();
    expect(holidayName('2027-06-07')).toBeNull();
  });

  it('선거일', () => {
    expect(holidayName('2028-04-12')).toBe('국회의원 선거일');
  });
});
