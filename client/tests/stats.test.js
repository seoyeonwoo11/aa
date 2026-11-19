import { describe, it, expect } from 'vitest';
import { periodRange, shiftPeriod, studyStreak, summarize } from '../src/stats/stats.js';
import { normalizePlans, addPlan, togglePlan, addRepeat, REPEAT_PRESETS } from '../src/plan/planList.js';

const H = 3600;

describe('periods', () => {
  it('builds Sunday-first weeks and calendar months', () => {
    expect(periodRange('week', '2026-11-19')).toEqual({ start: '2026-11-15', end: '2026-11-21', label: '11/15 ~ 11/21' });
    expect(periodRange('month', '2026-11-19')).toEqual({ start: '2026-11-01', end: '2026-11-30', label: '2026년 11월' });
    expect(shiftPeriod('week', '2026-11-19', -1)).toBe('2026-11-12');
    expect(shiftPeriod('month', '2026-11-19', 1)).toBe('2026-12-01');
    expect(periodRange('month', shiftPeriod('month', '2026-01-31', -1)).label).toBe('2025년 12월');
  });
});

describe('streak', () => {
  const s = (date) => ({ date, subject: '수학', seconds: 600 });
  it('counts consecutive study days ending today or yesterday', () => {
    expect(studyStreak([s('2026-11-17'), s('2026-11-18'), s('2026-11-19')], '2026-11-19')).toBe(3);
    expect(studyStreak([s('2026-11-17'), s('2026-11-18')], '2026-11-19')).toBe(2);
    expect(studyStreak([s('2026-11-16'), s('2026-11-18')], '2026-11-19')).toBe(1);
    expect(studyStreak([s('2026-11-10')], '2026-11-19')).toBe(0);
  });
});

describe('summarize', () => {
  const sessions = [
    { date: '2026-11-15', subject: '수학', seconds: 2 * H },
    { date: '2026-11-16', subject: '국어', seconds: 7 * H },
    { date: '2026-11-18', subject: '수학', seconds: 3 * H },
    { date: '2026-11-19', subject: '영어', seconds: 1 * H },
    { date: '2026-11-10', subject: '탐구', seconds: 9 * H } // 지난주
  ];
  let plans = addPlan(normalizePlans(null), '2026-11-18', 'a');
  plans = addPlan(plans, '2026-11-18', 'b');
  plans = togglePlan(plans, '2026-11-18', plans.days['2026-11-18'][0].id);
  plans = addRepeat(plans, { text: '영단어', days: REPEAT_PRESETS.daily, start: '2026-11-19' });
  plans = addPlan(plans, '2026-11-20', 'future'); // 아직 안 온 날은 세지 않음

  const r = summarize({ sessions, plans, goalMinutes: 360, kind: 'week', anchor: '2026-11-19', today: '2026-11-19' });

  it('totals only the period up to today', () => {
    expect(r.days).toHaveLength(7);
    expect(r.days.filter((d) => d.future).map((d) => d.date)).toEqual(['2026-11-20', '2026-11-21']);
    expect(r.total).toBe(13 * H);
    expect(r.countedDays).toBe(5);
    expect(r.average).toBe(Math.round((13 * H) / 5));
    expect(r.goalDays).toBe(1);
  });

  it('breaks down subjects in fixed order with shares', () => {
    expect(r.subjects.map((s) => [s.subject, s.seconds])).toEqual([['국어', 7 * H], ['수학', 5 * H], ['영어', 1 * H]]);
    expect(r.subjects.reduce((a, s) => a + s.share, 0)).toBeCloseTo(1);
  });

  it('counts to-dos including repeats', () => {
    expect(r.todo).toEqual({ done: 1, total: 3 });
    expect(r.streak).toBe(2);
  });
});
