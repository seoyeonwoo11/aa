// 공부 기록 계산 (화면과 무관한 순수 로직)
//
// running: 진행 중인 타이머 { subject, firstStartedAt, startedAt, elapsedBefore }
//   - startedAt이 null이면 일시정지 상태
// sessions: 저장된 기록 [{ date: 'YYYY-MM-DD', subject, seconds }]

import { parseDate, toDateText } from '../utils/date.js';

export const SUBJECTS = ['국어', '수학', '영어', '탐구', '한국사', '기타'];
export const MIN_SESSION_SECONDS = 60;

export function getElapsedSeconds(running, now = Date.now()) {
  if (!running) return 0;
  const live = running.startedAt ? (now - running.startedAt) / 1000 : 0;
  return Math.max(0, Math.floor(running.elapsedBefore + live));
}

export function startTimer(running, subject, now = Date.now()) {
  if (!running) return { subject, firstStartedAt: now, startedAt: now, elapsedBefore: 0 };
  return running.startedAt ? running : { ...running, startedAt: now };
}

export function pauseTimer(running, now = Date.now()) {
  if (!running?.startedAt) return running;
  return { ...running, startedAt: null, elapsedBefore: getElapsedSeconds(running, now) };
}

// 타이머를 끝내고 저장할 기록을 돌려준다. 1분 미만이면 null.
export function finishTimer(running, now = Date.now()) {
  const seconds = getElapsedSeconds(running, now);
  if (seconds < MIN_SESSION_SECONDS) return null;
  return { date: toDateText(new Date(running.firstStartedAt)), subject: running.subject, seconds };
}

export function totalsForDate(sessions, dateText) {
  const bySubject = {};
  let total = 0;
  for (const s of sessions) {
    if (s.date !== dateText) continue;
    total += s.seconds;
    bySubject[s.subject] = (bySubject[s.subject] || 0) + s.seconds;
  }
  return { total, bySubject };
}

// today를 포함한 최근 n일의 날짜별 합계 (오래된 날부터)
export function lastDaysTotals(sessions, today, n = 7) {
  const base = parseDate(toDateText(today));
  return Array.from({ length: n }, (_, i) => {
    const day = new Date(base);
    day.setDate(base.getDate() - (n - 1 - i));
    const date = toDateText(day);
    return { date, weekday: day.getDay(), seconds: totalsForDate(sessions, date).total };
  });
}

export function formatClock(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h && m) return `${h}시간 ${m}분`;
  if (h) return `${h}시간`;
  return `${m}분`;
}
