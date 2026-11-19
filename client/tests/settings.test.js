import { describe, it, expect } from 'vitest';
import { parseDate } from '../src/utils/date.js';
import { normalizeSettings, DEFAULT_GOAL_MINUTES } from '../src/settings/settings.js';

describe('settings', () => {
  const examDay = parseDate('2026-11-19');

  it('fills defaults', () => {
    expect(normalizeSettings({}, examDay)).toEqual({ academicYear: 2028, customDate: '', dailyGoalMinutes: DEFAULT_GOAL_MINUTES });
  });

  it('keeps valid values and clamps invalid ones', () => {
    expect(normalizeSettings({ academicYear: 2027, dailyGoalMinutes: 120 }, examDay)).toMatchObject({ academicYear: 2027, dailyGoalMinutes: 120 });
    expect(normalizeSettings({ academicYear: 2020, dailyGoalMinutes: 7 }, examDay)).toMatchObject({ academicYear: 2027, dailyGoalMinutes: DEFAULT_GOAL_MINUTES });
    expect(normalizeSettings({ academicYear: 2099 }, examDay).academicYear).toBe(2038);
  });
});
