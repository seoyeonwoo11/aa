// 계획 데이터 다루기 (화면과 무관한 순수 로직)
//
// plans = {
//   days:       { 'YYYY-MM-DD': [{ id, text, done }] },        // 날짜별 할 일
//   ranges:     [{ id, title, start, end, color, done }],      // 기간 계획 (start~end, 양 끝 포함)
//   repeats:    [{ id, text, days: [0~6], start, end }],       // 반복 할 일 (요일마다, end는 없으면 null)
//   repeatDone: { 'YYYY-MM-DD': [repeatId] },                  // 반복 할 일을 끝낸 날
//   memos:      { 'YYYY-MM-DD': '메모 글' }                     // 날짜별 메모
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
  const empty = { days: {}, ranges: [], repeats: [], repeatDone: {}, memos: {} };
  if (!raw || typeof raw !== 'object') return empty;
  if (!('days' in raw) && !('ranges' in raw) && !('repeats' in raw)) return { ...empty, days: raw };
  const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
  return {
    days: isObject(raw.days) ? raw.days : {},
    ranges: Array.isArray(raw.ranges) ? raw.ranges.filter((r) => isDateText(r.start) && isDateText(r.end)) : [],
    repeats: Array.isArray(raw.repeats) ? raw.repeats.filter((r) => isDateText(r.start) && Array.isArray(r.days)) : [],
    repeatDone: isObject(raw.repeatDone) ? raw.repeatDone : {},
    memos: isObject(raw.memos)
      ? Object.fromEntries(Object.entries(raw.memos).filter(([d, t]) => isDateText(d) && typeof t === 'string' && t.trim()))
      : {}
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

/* ---------- 반복 할 일 ---------- */

export const REPEAT_PRESETS = {
  daily: [0, 1, 2, 3, 4, 5, 6],
  weekdays: [1, 2, 3, 4, 5],
  weekend: [0, 6]
};

const weekdayOf = (date) => parseDate(date).getDay();
const dayBefore = (date) => {
  const d = parseDate(date);
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function addRepeat(plans, { text, days, start }) {
  const trimmed = String(text ?? '').trim().slice(0, MAX_PLAN_LENGTH);
  const cleanDays = [...new Set(days)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
  if (!trimmed || !cleanDays.length || !isDateText(start)) return plans;
  return { ...plans, repeats: [...plans.repeats, { id: newId(), text: trimmed, days: cleanDays, start, end: null }] };
}

// date에 해당하는 반복 할 일 (시작일 이후, 종료일 이전, 요일이 맞는 것)
export function repeatsOnDate(repeats, date) {
  const weekday = weekdayOf(date);
  return repeats.filter((r) => r.start <= date && (!r.end || date <= r.end) && r.days.includes(weekday));
}

export function toggleRepeatDone(plans, date, id) {
  const done = plans.repeatDone[date] || [];
  const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
  const repeatDone = { ...plans.repeatDone, [date]: next };
  if (!next.length) delete repeatDone[date];
  return { ...plans, repeatDone };
}

// date부터 반복을 그만한다. 시작일부터 그만두면 반복 자체를 지운다.
export function stopRepeat(plans, id, date) {
  const rule = plans.repeats.find((r) => r.id === id);
  if (!rule) return plans;
  if (date <= rule.start) {
    const repeatDone = {};
    for (const [d, ids] of Object.entries(plans.repeatDone)) {
      const rest = ids.filter((x) => x !== id);
      if (rest.length) repeatDone[d] = rest;
    }
    return { ...plans, repeats: plans.repeats.filter((r) => r.id !== id), repeatDone };
  }
  return { ...plans, repeats: plans.repeats.map((r) => (r.id === id ? { ...r, end: dayBefore(date) } : r)) };
}

// 반복 요일을 사람이 읽기 좋게: 매일 / 평일 / 주말 / 월·수·금
export function describeDays(days) {
  const key = [...days].sort().join(',');
  if (key === REPEAT_PRESETS.daily.join(',')) return '매일';
  if (key === REPEAT_PRESETS.weekdays.join(',')) return '평일';
  if (key === REPEAT_PRESETS.weekend.join(',')) return '주말';
  const names = ['일', '월', '화', '수', '목', '금', '토'];
  return [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => names[d]).join('·');
}

// 그날의 할 일 전체: 반복 할 일 먼저, 그다음 그날만의 할 일
// [{ id, text, done, repeat: true|false, repeatLabel }]
export function itemsForDate(plans, date) {
  const doneIds = plans.repeatDone[date] || [];
  const repeats = repeatsOnDate(plans.repeats, date).map((r) => ({
    id: r.id, text: r.text, done: doneIds.includes(r.id), repeat: true, repeatLabel: describeDays(r.days)
  }));
  const todos = (plans.days[date] || []).map((t) => ({ ...t, repeat: false }));
  return [...repeats, ...todos];
}

/* ---------- 날짜별 메모 ---------- */

export const MAX_MEMO_LENGTH = 2000;

// 빈 메모(공백뿐)는 지운다.
export function setMemo(plans, date, text) {
  const value = String(text ?? '').replace(/\s+$/, '').slice(0, MAX_MEMO_LENGTH);
  const memos = { ...plans.memos };
  if (value.trim()) memos[date] = value;
  else delete memos[date];
  return { ...plans, memos };
}

export const memoFor = (plans, date) => plans.memos?.[date] || '';

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
