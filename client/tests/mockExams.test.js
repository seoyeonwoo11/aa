import { describe, it, expect } from 'vitest';
import { toDateText } from '../src/utils/date.js';
import { estimateMockDate, getMockExams, nextMockExam, mockExamsByDate } from '../src/exam/mockExams.js';

describe('mock exams', () => {
  it('estimates the first Wednesday of June/September', () => {
    expect(toDateText(estimateMockDate(2025, 5))).toBe('2025-06-04'); // 실제 2026학년도 6월 모평
    expect(toDateText(estimateMockDate(2025, 8))).toBe('2025-09-03'); // 실제 2026학년도 9월 모평
    expect(toDateText(estimateMockDate(2027, 5))).toBe('2027-06-02');
    expect(toDateText(estimateMockDate(2027, 8))).toBe('2027-09-01');
  });

  it('lists presets for the target year with official, estimated and edited dates', () => {
    expect(getMockExams({ academicYear: 2026 }).map((e) => [e.name, e.date, e.status])).toEqual([
      ['6월 모의평가', '2025-06-04', 'official'], ['9월 모의평가', '2025-09-03', 'official']
    ]);
    const s = { academicYear: 2028, mockOverrides: { '2028-june': '2027-06-03' }, customExams: [{ id: 'a', name: '3월 학력평가', date: '2027-03-24' }] };
    expect(getMockExams(s).map((e) => [e.short, e.date, e.status])).toEqual([
      ['3월 학력평가', '2027-03-24', 'custom'], ['6모', '2027-06-03', 'edited'], ['9모', '2027-09-01', 'estimated']
    ]);
    expect(nextMockExam(s, '2027-03-25').name).toBe('6월 모의평가');
    expect(nextMockExam(s, '2027-09-02')).toBeNull();
    expect(Object.keys(mockExamsByDate(s))).toEqual(['2027-03-24', '2027-06-03', '2027-09-01']);
  });
});
