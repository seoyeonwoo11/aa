import { describe, it, expect } from 'vitest';
import {
  normalizePlans, addPlan, togglePlan, removePlan, planProgress,
  addRange, updateRange, toggleRange, removeRange, rangesOnDate, rangeDayInfo
} from '../src/plan/planList.js';

describe('daily plans', () => {
  it('adds, toggles and removes plans per date', () => {
    let plans = normalizePlans(null);
    plans = addPlan(plans, '2026-11-20', '  수학 기출 3회분 ');
    plans = addPlan(plans, '2026-11-20', '영단어 100개');
    plans = addPlan(plans, '2026-11-20', '   ');
    const [first, second] = plans.days['2026-11-20'];
    expect(first.text).toBe('수학 기출 3회분');
    expect(plans.days['2026-11-20']).toHaveLength(2);

    plans = togglePlan(plans, '2026-11-20', first.id);
    expect(planProgress(plans.days['2026-11-20'])).toEqual({ done: 1, total: 2 });

    plans = removePlan(plans, '2026-11-20', first.id);
    plans = removePlan(plans, '2026-11-20', second.id);
    expect(plans.days).toEqual({});
  });

  it('reads the old storage format', () => {
    const old = { '2026-11-19': [{ id: 'a', text: 'x', done: false }] };
    expect(normalizePlans(old)).toEqual({ days: old, ranges: [], repeats: [], repeatDone: {}, memos: {} });
  });
});

describe('range plans', () => {
  it('adds ranges, swapping reversed dates', () => {
    const plans = addRange(normalizePlans(null), { title: ' 수학 기출 1회독 ', start: '2026-12-05', end: '2026-11-20', color: '#2f9e44' });
    expect(plans.ranges[0]).toMatchObject({ title: '수학 기출 1회독', start: '2026-11-20', end: '2026-12-05', color: '#2f9e44', done: false });
  });

  it('validates input', () => {
    const empty = normalizePlans(null);
    expect(() => addRange(empty, { title: ' ', start: '2026-11-20', end: '2026-11-21' })).toThrow('이름');
    expect(() => addRange(empty, { title: 'x', start: '', end: '2026-11-21' })).toThrow('시작일');
    expect(addRange(empty, { title: 'x', start: '2026-11-20', end: '2026-11-20', color: 'red' }).ranges[0].color).toBe('#3457d5');
  });

  it('finds, updates, toggles and removes ranges', () => {
    let plans = normalizePlans(null);
    plans = addRange(plans, { title: '국어', start: '2026-11-25', end: '2026-11-30' });
    plans = addRange(plans, { title: '수학', start: '2026-11-20', end: '2026-12-05' });
    expect(rangesOnDate(plans.ranges, '2026-11-26').map((r) => r.title)).toEqual(['수학', '국어']);
    expect(rangesOnDate(plans.ranges, '2026-12-01').map((r) => r.title)).toEqual(['수학']);
    expect(rangeDayInfo(plans.ranges[1], '2026-11-22')).toEqual({ day: 3, total: 16 });

    const id = plans.ranges[0].id;
    plans = updateRange(plans, id, { title: '국어 비문학', start: '2026-11-25', end: '2026-12-01', color: '#ae3ec9' });
    plans = toggleRange(plans, id);
    expect(plans.ranges[0]).toMatchObject({ title: '국어 비문학', end: '2026-12-01', done: true });
    plans = removeRange(plans, id);
    expect(plans.ranges.map((r) => r.title)).toEqual(['수학']);
  });
});

import { addRepeat, repeatsOnDate, toggleRepeatDone, stopRepeat, describeDays, itemsForDate, REPEAT_PRESETS } from '../src/plan/planList.js';

describe('repeating plans', () => {
  // 2026-11-16(월) ~ 2026-11-22(일)
  it('shows a repeat only on its weekdays from its start date', () => {
    let plans = addRepeat(normalizePlans(null), { text: ' 영단어 100개 ', days: REPEAT_PRESETS.weekdays, start: '2026-11-17' });
    expect(repeatsOnDate(plans.repeats, '2026-11-16')).toHaveLength(0); // 시작 전
    expect(repeatsOnDate(plans.repeats, '2026-11-18')).toHaveLength(1); // 수
    expect(repeatsOnDate(plans.repeats, '2026-11-21')).toHaveLength(0); // 토
    plans = addRepeat(plans, { text: '', days: [1], start: '2026-11-17' });
    plans = addRepeat(plans, { text: 'x', days: [], start: '2026-11-17' });
    expect(plans.repeats).toHaveLength(1);
    expect(plans.repeats[0].text).toBe('영단어 100개');
  });

  it('tracks completion per day and merges with that day\'s to-dos', () => {
    let plans = addRepeat(normalizePlans(null), { text: '영단어', days: REPEAT_PRESETS.daily, start: '2026-11-16' });
    plans = addPlan(plans, '2026-11-18', '수학 기출');
    const id = plans.repeats[0].id;
    plans = toggleRepeatDone(plans, '2026-11-18', id);
    const items = itemsForDate(plans, '2026-11-18');
    expect(items.map((i) => [i.text, i.done, i.repeat])).toEqual([['영단어', true, true], ['수학 기출', false, false]]);
    expect(itemsForDate(plans, '2026-11-19')[0].done).toBe(false);
    expect(planProgress(items)).toEqual({ done: 1, total: 2 });
    plans = toggleRepeatDone(plans, '2026-11-18', id);
    expect(plans.repeatDone).toEqual({});
  });

  it('stops a repeat from a date, or removes it when stopped on its start', () => {
    let plans = addRepeat(normalizePlans(null), { text: '영단어', days: REPEAT_PRESETS.daily, start: '2026-11-16' });
    const id = plans.repeats[0].id;
    plans = toggleRepeatDone(plans, '2026-11-16', id);
    const stopped = stopRepeat(plans, id, '2026-11-20');
    expect(stopped.repeats[0].end).toBe('2026-11-19');
    expect(repeatsOnDate(stopped.repeats, '2026-11-19')).toHaveLength(1);
    expect(repeatsOnDate(stopped.repeats, '2026-11-20')).toHaveLength(0);
    const removed = stopRepeat(plans, id, '2026-11-16');
    expect(removed.repeats).toEqual([]);
    expect(removed.repeatDone).toEqual({});
  });

  it('describes weekday sets', () => {
    expect(describeDays(REPEAT_PRESETS.daily)).toBe('매일');
    expect(describeDays([5, 1, 2, 3, 4])).toBe('평일');
    expect(describeDays([0, 6])).toBe('주말');
    expect(describeDays([5, 1, 3])).toBe('월·수·금');
    expect(describeDays([0, 2])).toBe('화·일');
  });
});

import { setMemo, memoFor, MAX_MEMO_LENGTH } from '../src/plan/planList.js';

describe('memos', () => {
  it('saves, trims trailing space, and deletes empty memos', () => {
    let plans = setMemo(normalizePlans(null), '2026-11-19', '수학 기출 오답 정리\n  내일 다시 보기  \n\n');
    expect(memoFor(plans, '2026-11-19')).toBe('수학 기출 오답 정리\n  내일 다시 보기');
    expect(memoFor(plans, '2026-11-20')).toBe('');
    plans = setMemo(plans, '2026-11-19', '   \n ');
    expect(plans.memos).toEqual({});
    expect(setMemo(normalizePlans(null), '2026-11-19', 'x'.repeat(3000)).memos['2026-11-19']).toHaveLength(MAX_MEMO_LENGTH);
  });

  it('drops invalid memos when reading saved data', () => {
    expect(normalizePlans({ days: {}, memos: { '2026-11-19': '메모', bad: 'x', '2026-11-20': '  ', '2026-11-21': 3 } }).memos)
      .toEqual({ '2026-11-19': '메모' });
  });
});
