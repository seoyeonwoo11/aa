// 통계 계산 (화면과 무관한 순수 로직)

import { parseDate, toDateText } from '../utils/date.js';
import { SUBJECTS } from '../study/studyLog.js';
import { itemsForDate, planProgress } from '../plan/planList.js';

const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

// kind: 'week'(일~토) | 'month'. anchor: 그 기간 안의 아무 날('YYYY-MM-DD')
export function periodRange(kind, anchor) {
  const d = parseDate(anchor);
  if (kind === 'month') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: toDateText(start), end: toDateText(end), label: `${d.getFullYear()}년 ${d.getMonth() + 1}월` };
  }
  const start = addDays(d, -d.getDay());
  const end = addDays(start, 6);
  const fmt = (x) => `${x.getMonth() + 1}/${x.getDate()}`;
  return { start: toDateText(start), end: toDateText(end), label: `${fmt(start)} ~ ${fmt(end)}` };
}

export function shiftPeriod(kind, anchor, n) {
  const d = parseDate(anchor);
  if (kind === 'month') return toDateText(new Date(d.getFullYear(), d.getMonth() + n, 1));
  return toDateText(addDays(d, n * 7));
}

export function datesBetween(start, end) {
  const out = [];
  for (let d = parseDate(start); toDateText(d) <= end; d = addDays(d, 1)) out.push(toDateText(d));
  return out;
}

// 오늘(포함)부터 거꾸로 하루도 빠짐없이 공부한 날 수. 오늘 아직 안 했으면 어제부터 센다.
export function studyStreak(sessions, today) {
  const studied = new Set(sessions.filter((s) => s.seconds > 0).map((s) => s.date));
  let d = parseDate(today);
  if (!studied.has(today)) d = addDays(d, -1);
  let count = 0;
  while (studied.has(toDateText(d))) {
    count += 1;
    d = addDays(d, -1);
  }
  return count;
}

// 기간 통계
// 반환: { range, days: [{ date, seconds, future }], total, average, goalDays, countedDays,
//         subjects: [{ subject, seconds, share }], todo: { done, total }, streak }
export function summarize({ sessions = [], plans, goalMinutes = 0, kind, anchor, today }) {
  const range = periodRange(kind, anchor);
  const byDate = {};
  const bySubject = {};
  for (const s of sessions) {
    if (s.date < range.start || s.date > range.end) continue;
    byDate[s.date] = (byDate[s.date] || 0) + s.seconds;
    bySubject[s.subject] = (bySubject[s.subject] || 0) + s.seconds;
  }

  const days = datesBetween(range.start, range.end).map((date) => ({ date, seconds: byDate[date] || 0, future: date > today }));
  const counted = days.filter((d) => !d.future); // 평균·목표 달성은 지나간 날(오늘 포함)만
  const total = counted.reduce((sum, d) => sum + d.seconds, 0);
  const goalSeconds = goalMinutes * 60;

  const todo = { done: 0, total: 0 };
  if (plans) {
    for (const d of counted) {
      const p = planProgress(itemsForDate(plans, d.date));
      todo.done += p.done;
      todo.total += p.total;
    }
  }

  // 과목 순서는 고정(색이 과목을 따라가도록), 시간이 0인 과목은 뺀다
  const subjects = [...SUBJECTS, ...Object.keys(bySubject).filter((s) => !SUBJECTS.includes(s))]
    .filter((subject) => bySubject[subject] > 0)
    .map((subject) => ({ subject, seconds: bySubject[subject], share: total ? bySubject[subject] / total : 0 }));

  return {
    range,
    days,
    total,
    average: counted.length ? Math.round(total / counted.length) : 0,
    goalDays: goalSeconds ? counted.filter((d) => d.seconds >= goalSeconds).length : 0,
    countedDays: counted.length,
    subjects,
    todo,
    streak: studyStreak(sessions, today)
  };
}
