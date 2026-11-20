import { describe, it, expect } from 'vitest';
import { parseDate } from '../src/utils/date.js';
import { normalizeSettings, DEFAULT_GOAL_MINUTES } from '../src/settings/settings.js';

describe('settings', () => {
  const examDay = parseDate('2026-11-19');

  it('fills defaults', () => {
    expect(normalizeSettings({}, examDay)).toEqual({ academicYear: 2028, targetKind: 'suneung', targetMockId: '', customName: '', customDate: '', dailyGoalMinutes: DEFAULT_GOAL_MINUTES, mockOverrides: {}, customExams: [] });
  });

  it('keeps valid values and clamps invalid ones', () => {
    expect(normalizeSettings({ academicYear: 2027, dailyGoalMinutes: 120 }, examDay)).toMatchObject({ academicYear: 2027, dailyGoalMinutes: 120 });
    expect(normalizeSettings({ academicYear: 2020, dailyGoalMinutes: 7 }, examDay)).toMatchObject({ academicYear: 2027, dailyGoalMinutes: DEFAULT_GOAL_MINUTES });
    expect(normalizeSettings({ academicYear: 2099 }, examDay).academicYear).toBe(2038);
  });

  it('keeps valid mock exam settings only', () => {
    const s = normalizeSettings({
      mockOverrides: { '2028-june': '2027-06-03', '2028-bad': '2027-01-01', '2028-sept': 'nope' },
      customExams: [{ id: 'a', name: ' 3월 학력평가 ', date: '2027-03-24' }, { id: 'b', name: '', date: '2027-04-01' }, { id: 'c', name: 'x', date: 'bad' }]
    }, examDay);
    expect(s.mockOverrides).toEqual({ '2028-june': '2027-06-03' });
    expect(s.customExams).toEqual([{ id: 'a', name: '3월 학력평가', date: '2027-03-24' }]);
  });

  it('목표 시험 종류: 예전 설정(날짜만 직접 입력)은 직접 정한 시험으로 읽는다', () => {
    expect(normalizeSettings({ customDate: '2027-07-01' }, examDay)).toMatchObject({ targetKind: 'custom', customDate: '2027-07-01', customName: '' });
    expect(normalizeSettings({ targetKind: 'nope' }, examDay).targetKind).toBe('suneung');
    expect(normalizeSettings({ targetKind: 'mock', targetMockId: '2028-june' }, examDay)).toMatchObject({ targetKind: 'mock', targetMockId: '2028-june' });
    expect(normalizeSettings({ customName: '  기말고사  ', customDate: 'bad' }, examDay)).toMatchObject({ customName: '기말고사', customDate: '', targetKind: 'suneung' });
  });
});
