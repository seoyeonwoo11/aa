import { describe, it, expect } from 'vitest';
import { addPlan, togglePlan, removePlan, planProgress } from '../src/plan/planList.js';

describe('plan list', () => {
  it('adds, toggles and removes plans per date', () => {
    let plans = addPlan({}, '2026-11-20', '  수학 기출 3회분 ');
    plans = addPlan(plans, '2026-11-20', '영단어 100개');
    plans = addPlan(plans, '2026-11-20', '   ');
    const [first, second] = plans['2026-11-20'];
    expect(first.text).toBe('수학 기출 3회분');
    expect(plans['2026-11-20']).toHaveLength(2);

    plans = togglePlan(plans, '2026-11-20', first.id);
    expect(planProgress(plans['2026-11-20'])).toEqual({ done: 1, total: 2 });

    plans = removePlan(plans, '2026-11-20', first.id);
    plans = removePlan(plans, '2026-11-20', second.id);
    expect(plans).toEqual({});
  });
});
