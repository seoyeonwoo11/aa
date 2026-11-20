import { describe, it, expect } from 'vitest';
import { toDateText } from '../src/utils/date.js';
import { estimateMockDate, getMockExams, nextMockExam, mockExamsByDate, PRESETS } from '../src/exam/mockExams.js';

describe('mock exams', () => {
  it('estimates the first Wednesday of June/September', () => {
    expect(toDateText(estimateMockDate(2025, 5))).toBe('2025-06-04'); // 실제 2026학년도 6월 모평
    expect(toDateText(estimateMockDate(2025, 8))).toBe('2025-09-03'); // 실제 2026학년도 9월 모평
    expect(toDateText(estimateMockDate(2027, 5))).toBe('2027-06-02');
    expect(toDateText(estimateMockDate(2027, 8))).toBe('2027-09-01');
  });

  it('lists presets for the target year with official, estimated and edited dates', () => {
    expect(getMockExams({ academicYear: 2026 }).filter((e) => e.status === 'official').map((e) => [e.name, e.date])).toEqual([
      ['6월 모의평가', '2025-06-04'], ['9월 모의평가', '2025-09-03']
    ]);
    const s = { academicYear: 2028, mockOverrides: { '2028-june': '2027-06-03' }, customExams: [{ id: 'a', name: '사설 모의고사', date: '2027-04-15' }] };
    expect(getMockExams(s).map((e) => [e.short, e.date, e.status])).toEqual([
      ['3학평', '2027-03-24', 'estimated'], ['사설 모의고사', '2027-04-15', 'custom'], ['5학평', '2027-05-06', 'estimated'],
      ['6모', '2027-06-03', 'edited'], ['7학평', '2027-07-14', 'estimated'], ['8모', '2027-08-25', 'estimated'], ['10학평', '2027-10-19', 'estimated']
    ]);
    expect(nextMockExam(s, '2027-03-25').name).toBe('사설 모의고사');
    expect(nextMockExam(s, '2027-06-04').name).toBe('7월 학력평가');
    expect(nextMockExam(s, '2027-10-20')).toBeNull();
    expect(Object.keys(mockExamsByDate(s))).toHaveLength(7);
  });

  it('2027학년도(2026년 시행) 고3 학력평가·모의평가는 발표된 날짜', () => {
    expect(getMockExams({ academicYear: 2027 }).map((e) => [e.name, e.date, e.status])).toEqual([
      ['3월 학력평가', '2026-03-24', 'official'], ['5월 학력평가', '2026-05-07', 'official'], ['6월 모의평가', '2026-06-04', 'official'],
      ['7월 학력평가', '2026-07-08', 'official'], ['9월 모의평가', '2026-09-02', 'official'], ['10월 학력평가', '2026-10-20', 'official']
    ]);
  });

  it('예상 규칙이 2026년 실제 날짜와 대부분 맞는다 (5·7·9·10월)', () => {
    const est = Object.fromEntries(PRESETS.map((p) => [p.key, toDateText(p.estimate(2026))]));
    expect([est.may, est.jul, est.sept, est.oct]).toEqual(['2026-05-07', '2026-07-08', '2026-09-02', '2026-10-20']);
  });

  it('2028학년도부터 하반기 모의평가는 8월 넷째 수요일(예상), 이름도 8월 모의평가', () => {
    const late = (y) => getMockExams({ academicYear: y }).find((e) => e.id === `${y}-sept`);
    expect([late(2027).name, late(2027).date]).toEqual(['9월 모의평가', '2026-09-02']);
    expect([late(2028).name, late(2028).short, late(2028).date]).toEqual(['8월 모의평가', '8모', '2027-08-25']);
    expect(late(2029).date).toBe('2028-08-23');
    // 사용자가 고친 날짜는 그대로 쓴다
    expect(getMockExams({ academicYear: 2028, mockOverrides: { '2028-sept': '2027-08-31' } }).find((e) => e.id === '2028-sept').date).toBe('2027-08-31');
  });
});
