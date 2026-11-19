import { parseDate } from '../utils/date.js';

export const EXAM_START_HOUR = 8;
export const EXAM_START_MINUTE = 40;
export const YEARS_AHEAD = 10; // 다가오는 수능부터 10년 뒤 학년도까지 선택 가능

// 교육부가 공식 발표한 수능 날짜. 새 날짜가 발표되면 여기에 추가한다.
export const OFFICIAL_DATES = {
  2025: '2024-11-14',
  2026: '2025-11-13',
  2027: '2026-11-19'
};

// 공식 발표 전에는 11월 셋째 목요일로 추정한다.
export function estimateExamDate(calendarYear) {
  const first = new Date(calendarYear, 10, 1);
  const offset = (4 - first.getDay() + 7) % 7; // 4 = 목요일
  return new Date(calendarYear, 10, 1 + offset + 14);
}

// 학년도(예: 2028학년도)는 시험이 치러지는 해 + 1
export function getExam(academicYear) {
  const official = OFFICIAL_DATES[academicYear];
  return {
    academicYear,
    date: official ? parseDate(official) : estimateExamDate(academicYear - 1),
    official: Boolean(official)
  };
}

// today(자정 기준)에 아직 치르지 않은, 또는 오늘 치르는 가장 가까운 수능의 학년도
export function findUpcomingAcademicYear(today) {
  let year = today.getFullYear() + 1;
  while (getExam(year).date < today) year += 1;
  return year;
}

// 기본으로 보여줄 수능: 오늘이 시험 날이면 다음 해 수능, 아니면 다가오는 수능
export function getDefaultAcademicYear(today) {
  const year = findUpcomingAcademicYear(today);
  return getExam(year).date.getTime() === today.getTime() ? year + 1 : year;
}

// 다가오는 수능(오늘 시험 포함)부터 기본 수능의 10년 뒤까지
export function getSelectableYears(today) {
  const first = findUpcomingAcademicYear(today);
  const last = getDefaultAcademicYear(today) + YEARS_AHEAD;
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

export function getExamStart(date) {
  const start = new Date(date);
  start.setHours(EXAM_START_HOUR, EXAM_START_MINUTE, 0, 0);
  return start;
}
