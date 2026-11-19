const DAY_MS = 86400000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 'YYYY-MM-DD'를 로컬 시간 기준 Date로 바꾼다. (toISOString의 UTC 어긋남 방지)
export function parseDate(text) {
  const [y, m, d] = text.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDateText(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

// from 이후 to 이전에 오는 토요일 수 = 남은 주말 수
export function countWeekends(from, to) {
  let count = 0;
  const cursor = startOfDay(from);
  while (cursor < to) {
    if (cursor.getDay() === 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function formatKoreanDate(date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
}
