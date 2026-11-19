// 사용자 설정의 기본값과 정리

import { startOfDay } from '../utils/date.js';
import { getDefaultAcademicYear, getSelectableYears } from '../exam/examDates.js';
import { isDateText } from '../exam/mockExams.js';

export const DEFAULT_GOAL_MINUTES = 360;
export const GOAL_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1) * 60); // 1~12시간

export function normalizeSettings(saved, today = startOfDay(new Date())) {
  const years = getSelectableYears(today);
  const year = Number(saved?.academicYear) || getDefaultAcademicYear(today);
  const goal = Number(saved?.dailyGoalMinutes);
  const overrides = {};
  for (const [key, date] of Object.entries(saved?.mockOverrides || {})) {
    if (/^\d{4}-(june|sept)$/.test(key) && isDateText(date)) overrides[key] = date;
  }
  const customExams = (Array.isArray(saved?.customExams) ? saved.customExams : [])
    .filter((e) => e && typeof e.name === 'string' && e.name.trim() && isDateText(e.date))
    .map((e) => ({ id: String(e.id), name: e.name.trim().slice(0, 30), date: e.date }));
  return {
    academicYear: Math.min(Math.max(year, years[0]), years[years.length - 1]),
    customDate: saved?.customDate || '',
    dailyGoalMinutes: GOAL_OPTIONS.includes(goal) ? goal : DEFAULT_GOAL_MINUTES,
    mockOverrides: overrides,
    customExams
  };
}
