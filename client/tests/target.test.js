import { describe, it, expect } from 'vitest';
import { parseDate, toDateText } from '../src/utils/date.js';
import { normalizeSettings } from '../src/settings/settings.js';
import { getTarget } from '../src/exam/target.js';

const today = parseDate('2026-11-20');
const make = (saved) => normalizeSettings({ academicYear: 2028, ...saved }, today);

describe('목표 시험', () => {
  it('기본은 수능', () => {
    const t = getTarget(make({}));
    expect(t).toMatchObject({ kind: 'suneung', label: '2028학년도 수능' });
    expect(t.previous).not.toBeNull();
  });

  it('모의고사를 고르면 그 시험 날짜와 이름', () => {
    const t = getTarget(make({ targetKind: 'mock', targetMockId: '2028-june', mockOverrides: { '2028-june': '2027-06-03' } }));
    expect(t).toMatchObject({ kind: 'mock', id: '2028-june', label: '6월 모의평가', badge: '수정함', previous: null });
    expect(toDateText(t.date)).toBe('2027-06-03');
  });

  it('직접 추가한 시험도 목표로 고를 수 있다', () => {
    const t = getTarget(make({ targetKind: 'mock', targetMockId: 'x1', customExams: [{ id: 'x1', name: '3월 학력평가', date: '2027-03-24' }] }));
    expect(t).toMatchObject({ kind: 'mock', label: '3월 학력평가', badge: '직접 추가' });
  });

  it('고른 모의고사가 없어지면 수능으로 돌아간다', () => {
    expect(getTarget(make({ targetKind: 'mock', targetMockId: 'gone' })).kind).toBe('suneung');
  });

  it('직접 정한 시험: 이름과 날짜, 이름이 없으면 기본 이름, 날짜가 없으면 수능', () => {
    const t = getTarget(make({ targetKind: 'custom', customName: '2학기 기말고사', customDate: '2026-12-10' }));
    expect(t).toMatchObject({ kind: 'custom', label: '2학기 기말고사', badge: '직접 입력' });
    expect(toDateText(t.date)).toBe('2026-12-10');
    expect(getTarget(make({ targetKind: 'custom', customDate: '2026-12-10' })).label).toBe('직접 정한 시험');
    expect(getTarget(make({ targetKind: 'custom' })).kind).toBe('suneung');
  });
});
