// 계획 데이터 다루기 (화면과 무관한 순수 로직)
//
// plans = {
//   days:   { 'YYYY-MM-DD': [{ id, text, done }] },            // 날짜별 상세 계획(할 일)
//   ranges: [{ id, title, start, end, color, done }]            // 기간 계획 (start~end, 양 끝 포함)
// }

import { parseDate, daysBetween } from '../utils/date.js';

export const MAX_PLAN_LENGTH = 100;
export const RANGE_COLORS = ['#3457d5', '#e8590c', '#2f9e44', '#ae3ec9', '#d6336c'];

function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const isDateText = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

// 이전 형식({ 날짜: [할 일] })도 그대로 읽는다.
export function normalizePlans(raw) {
  if (!raw || typeof raw !== 'object') return { days: {}, ranges: [] };
  if (!('days' in raw) && !('ranges' in raw)) return { days: raw, ranges: [] };
  return {
    days: raw.days && typeof raw.days === 'object' ? raw.days : {},
    ranges: Array.isArray(raw.ranges) ? raw.ranges.filter((r) => isDateText(r.start) && isDateText(r.end)) : []
  };
}

/* ---------- 날짜별 할 일 ---------- */

export function addPlan(plans, date, text) {
  const trimmed = text.trim().slice(0, MAX_PLAN_LENGTH);
  if (!trimmed) return plans;
  const items = [...(plans.days[date] || []), { id: newId(), text: trimmed, done: false }];
  return { ...plans, days: { ...plans.days, [date]: items } };
}

export function togglePlan(plans, date, id) {
  const items = (plans.days[date] || []).map((p) => (p.id === id ? { ...p, done: !p.done } : p));
  return { ...plans, days: { ...plans.days, [date]: items } };
}

export function removePlan(plans, date, id) {
  const rest = (plans.days[date] || []).filter((p) => p.id !== id);
  const days = { ...plans.days, [date]: rest };
  if (!rest.length) delete days[date];
  return { ...plans, days };
}

export function planProgress(items = []) {
  const done = items.filter((p) => p.done).length;
  return { done, total: items.length };
}

/* ---------- 기간 계획 ---------- */

function cleanRange({ title, start, end, color }) {
  const text = String(title ?? '').trim().slice(0, MAX_PLAN_LENGTH);
  if (!text) throw new Error('계획 이름을 입력해 주세요.');
  if (!isDateText(start) || !isDateText(end)) throw new Error('시작일과 종료일을 골라 주세요.');
  const [s, e] = start <= end ? [start, end] : [end, start];
  return { title: text, start: s, end: e, color: RANGE_COLORS.includes(color) ? color : RANGE_COLORS[0] };
}

export function addRange(plans, range) {
  return { ...plans, ranges: [...plans.ranges, { id: newId(), done: false, ...cleanRange(range) }] };
}

export function updateRange(plans, id, range) {
  return { ...plans, ranges: plans.ranges.map((r) => (r.id === id ? { ...r, ...cleanRange(range) } : r)) };
}

export function toggleRange(plans, id) {
  return { ...plans, ranges: plans.ranges.map((r) => (r.id === id ? { ...r, done: !r.done } : r)) };
}

export function removeRange(plans, id) {
  return { ...plans, ranges: plans.ranges.filter((r) => r.id !== id) };
}

// date를 포함하는 기간 계획 (시작이 빠른 순, 같으면 긴 순)
export function rangesOnDate(ranges, date) {
  return ranges.filter((r) => r.start <= date && date <= r.end).sort(compareRanges);
}

export function compareRanges(a, b) {
  return a.start.localeCompare(b.start) || b.end.localeCompare(a.end) || a.id.localeCompare(b.id);
}

// 기간 중 며칠째인지: { day: 3, total: 10 }
export function rangeDayInfo(range, date) {
  return {
    day: daysBetween(parseDate(range.start), parseDate(date)) + 1,
    total: daysBetween(parseDate(range.start), parseDate(range.end)) + 1
  };
}
