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
    expect(normalizePlans(old)).toEqual({ days: old, ranges: [] });
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
