// 공부 기록 계산 (화면과 무관한 순수 로직)
//
// running: 진행 중인 타이머 { subject, firstStartedAt, startedAt, elapsedBefore, carried, history }
//   - startedAt이 null이면 일시정지 상태
//   - 공부 도중 과목을 바꾸면 그때까지의 시간은 기록(sessions)으로 넘기고,
//     carried(이번 공부에서 앞 과목들에 쓴 시간)와 history(과목별 시간)에 남긴다.
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
  if (!running) return { subject, firstStartedAt: now, startedAt: now, elapsedBefore: 0, lastSeenAt: now };
  if (running.startedAt) return running;
  const { autoPausedAt, ...rest } = running;
  return { ...rest, startedAt: now, lastSeenAt: now };
}

export function pauseTimer(running, now = Date.now()) {
  if (!running?.startedAt) return running;
  return { ...running, startedAt: null, elapsedBefore: getElapsedSeconds(running, now) };
}

// 앱(화면)을 나가서 멈춘 경우. 돌아왔을 때 얼마나 나가 있었는지 알 수 있게 시각을 남긴다.
export function autoPauseTimer(running, now = Date.now()) {
  if (!running?.startedAt) return running;
  return { ...pauseTimer(running, now), autoPausedAt: now };
}

// 안드로이드 앱에서 화면이 가려졌다가 돌아왔을 때: 그 사이 화면이 꺼졌었는지로 판단한다.
// (웹은 화면 끄기와 다른 앱으로 나가기를 구별하지 못하지만, 앱은 휴대폰에게 물어볼 수 있다)
//   screen: 휴대폰이 기억해 둔 것 (없으면 0)
//     pausedAt/pausedInteractive, stoppedAt/stoppedInteractive: 앱이 뒤로 간 시각과 그때 화면이 켜져 있었는지
//     screenOffAt, screenOnAt, unlockedAt: 화면이 꺼진·켜진·잠금이 풀린 시각
//   hiddenAt: 웹이 '가려짐'을 받은 시각 (화면이 꺼지면 웹 코드가 멈춰 늦게 기록될 수 있어 휴대폰 기록을 먼저 쓴다)
//   - 앱이 뒤로 갈 때 화면이 꺼져 있었다 → 화면을 끈 것: 계속 잰다
//       단, 화면을 다시 켜고 잠금을 푼 뒤 15초 넘게 앱으로 안 돌아왔다면 그때 다른 일을 한 것으로 보고 그 시각에 멈춘다
//   - 아니면 다른 앱으로 나간 것: 뒤로 간 시각에 멈춘다
// 반환: { running, reason: 'screen-off' | 'left' | 'left-after-unlock' | null }
export const SCREEN_OFF_WINDOW = 3000;
export const BACK_AFTER_UNLOCK = 15000;
export function settleAway(running, hiddenAt, screen, now = Date.now()) {
  const { hiddenAt: _drop, ...clean } = running || {};
  if (!running?.startedAt) return { running: running && clean, reason: null };
  const since = Math.max(running.startedAt, running.settledAt || 0);
  const paused = screen?.pausedAt > since && screen.pausedAt <= now ? screen.pausedAt : 0;
  const awayAt = paused || (hiddenAt > since ? hiddenAt : 0);
  if (!awayAt) return { running: clean, reason: null };
  const settled = { ...clean, settledAt: awayAt };
  if (!screen) return { running: autoPauseTimer(settled, awayAt), reason: 'left' };

  const off = screen.screenOffAt || 0;
  const offNearAway = off >= awayAt - SCREEN_OFF_WINDOW && off <= awayAt + SCREEN_OFF_WINDOW;
  const stoppedThisTime = screen.stoppedAt >= awayAt - 1000;
  const wentOff = (paused && screen.pausedInteractive === false)
    || (stoppedThisTime && screen.stoppedInteractive === false)
    || (!stoppedThisTime && offNearAway); // 휴대폰 기록이 없으면 화면 꺼짐 시각으로 짐작
  if (!wentOff) return { running: autoPauseTimer(settled, awayAt), reason: 'left' };

  const offAt = off >= awayAt - SCREEN_OFF_WINDOW ? off : awayAt;
  const backOn = [screen.unlockedAt, screen.screenOnAt].find((t) => t > offAt) || now;
  if (now - backOn > BACK_AFTER_UNLOCK) return { running: autoPauseTimer(settled, backOn), reason: 'left-after-unlock' };
  return { running: settled, reason: 'screen-off' };
}

// 화면을 나간 이벤트를 받지 못하고 앱이 꺼진 경우(강제 종료 등):
// 마지막으로 앱이 살아 있던 시각에 멈춘 것으로 처리해, 나가 있던 시간이 공부 시간에 들어가지 않게 한다.
export function recoverTimer(running, now = Date.now()) {
  if (!running?.startedAt) return running;
  const lastSeen = Math.min(running.lastSeenAt ?? now, now);
  return autoPauseTimer(running, Math.max(lastSeen, running.startedAt));
}

// 이번 공부 전체 시간 (과목을 바꿨어도 이어서): 화면의 큰 타이머에 쓴다.
export function getTotalSeconds(running, now = Date.now()) {
  return running ? (running.carried || 0) + getElapsedSeconds(running, now) : 0;
}

// 공부 도중 과목 바꾸기. 반환: { running, session }
// - 지금 과목으로 1분 이상 했으면 그 시간을 기록(session)으로 넘기고 새 과목으로 이어서 센다.
// - 1분이 안 됐으면 잘못 고른 것으로 보고 과목 이름만 바꾼다.
export function switchSubject(running, subject, now = Date.now()) {
  if (!running || running.subject === subject) return { running, session: null };
  const seconds = getElapsedSeconds(running, now);
  if (seconds < MIN_SESSION_SECONDS) return { running: { ...running, subject }, session: null };
  const session = { date: toDateText(new Date(running.firstStartedAt)), subject: running.subject, seconds };
  const { autoPausedAt, ...rest } = running;
  return {
    session,
    running: {
      ...rest,
      subject,
      firstStartedAt: now,
      startedAt: running.startedAt ? now : null,
      elapsedBefore: 0,
      lastSeenAt: now,
      carried: (running.carried || 0) + seconds,
      history: [...(running.history || []), { subject: running.subject, seconds }]
    }
  };
}

// 이번 공부에서 과목별로 쓴 시간 (끝낼 때 안내용): [{ subject, seconds }]
export function runSummary(running, finalSession) {
  const parts = [...(running?.history || [])];
  if (finalSession) parts.push({ subject: finalSession.subject, seconds: finalSession.seconds });
  const merged = [];
  for (const p of parts) {
    const same = merged.find((m) => m.subject === p.subject);
    if (same) same.seconds += p.seconds;
    else merged.push({ ...p });
  }
  return merged;
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
