import { describe, it, expect } from 'vitest';
import {
  getElapsedSeconds, startTimer, pauseTimer, autoPauseTimer, recoverTimer, finishTimer, totalsForDate, lastDaysTotals, formatClock, formatDuration
} from '../src/study/studyLog.js';

const at = (h, m = 0, s = 0) => new Date(2026, 10, 19, h, m, s).getTime();

describe('study timer', () => {
  it('accumulates time across pause and resume', () => {
    let r = startTimer(null, '수학', at(9));
    expect(getElapsedSeconds(r, at(9, 30))).toBe(1800);
    r = pauseTimer(r, at(9, 30));
    expect(getElapsedSeconds(r, at(12))).toBe(1800);
    r = startTimer(r, '국어', at(10));
    expect(r.subject).toBe('수학');
    expect(getElapsedSeconds(r, at(10, 15))).toBe(2700);
    expect(finishTimer(r, at(10, 15))).toEqual({ date: '2026-11-19', subject: '수학', seconds: 2700 });
  });

  it('auto-pauses when leaving and clears the mark on resume', () => {
    let r = autoPauseTimer(startTimer(null, '수학', at(9)), at(9, 20));
    expect(r).toMatchObject({ startedAt: null, elapsedBefore: 1200, autoPausedAt: at(9, 20) });
    expect(getElapsedSeconds(r, at(11))).toBe(1200);
    r = startTimer(r, '수학', at(11));
    expect(r.autoPausedAt).toBeUndefined();
    expect(getElapsedSeconds(r, at(11, 10))).toBe(1800);
  });

  it('recovers a timer left running by a killed app at its last heartbeat', () => {
    const r = { ...startTimer(null, '영어', at(9)), lastSeenAt: at(9, 40) };
    const recovered = recoverTimer(r, at(13));
    expect(getElapsedSeconds(recovered, at(13))).toBe(2400);
    expect(recovered.autoPausedAt).toBe(at(9, 40));
  });

  it('drops sessions shorter than a minute', () => {
    expect(finishTimer(startTimer(null, '영어', at(9)), at(9, 0, 59))).toBeNull();
  });
});

describe('study totals', () => {
  const sessions = [
    { date: '2026-11-19', subject: '수학', seconds: 3600 },
    { date: '2026-11-19', subject: '국어', seconds: 1200 },
    { date: '2026-11-19', subject: '수학', seconds: 600 },
    { date: '2026-11-17', subject: '영어', seconds: 900 }
  ];

  it('sums by date and subject', () => {
    expect(totalsForDate(sessions, '2026-11-19')).toEqual({ total: 5400, bySubject: { 수학: 4200, 국어: 1200 } });
  });

  it('lists the last 7 days ending today', () => {
    const days = lastDaysTotals(sessions, new Date(2026, 10, 19, 15), 7);
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe('2026-11-13');
    expect(days[6]).toMatchObject({ date: '2026-11-19', seconds: 5400 });
    expect(days[4].seconds).toBe(900);
  });

  it('formats durations', () => {
    expect(formatClock(3725)).toBe('01:02:05');
    expect(formatDuration(5400)).toBe('1시간 30분');
    expect(formatDuration(7200)).toBe('2시간');
    expect(formatDuration(59)).toBe('0분');
  });
});

import { switchSubject, getTotalSeconds, runSummary } from '../src/study/studyLog.js';

describe('switching subject mid-study', () => {
  const at2 = (h, m = 0, sec = 0) => new Date(2026, 10, 19, h, m, sec).getTime();

  it('records the time so far and keeps counting the total', () => {
    let r = startTimer(null, '국어', at2(9));
    const first = switchSubject(r, '영어', at2(9, 30));
    expect(first.session).toEqual({ date: '2026-11-19', subject: '국어', seconds: 1800 });
    r = first.running;
    expect(r).toMatchObject({ subject: '영어', carried: 1800, elapsedBefore: 0 });
    expect(getElapsedSeconds(r, at2(9, 50))).toBe(1200);
    expect(getTotalSeconds(r, at2(9, 50))).toBe(3000);

    const second = switchSubject(r, '국어', at2(9, 50));
    r = second.running;
    const last = finishTimer(r, at2(10, 10));
    expect(last).toEqual({ date: '2026-11-19', subject: '국어', seconds: 1200 });
    expect(runSummary(r, last)).toEqual([{ subject: '국어', seconds: 3000 }, { subject: '영어', seconds: 1200 }]);
  });

  it('just relabels when switched within the first minute', () => {
    const r = startTimer(null, '국어', at2(9));
    const { running, session } = switchSubject(r, '수학', at2(9, 0, 40));
    expect(session).toBeNull();
    expect(running.subject).toBe('수학');
    expect(getElapsedSeconds(running, at2(9, 1))).toBe(60);
  });

  it('keeps a paused timer paused after switching', () => {
    const r = pauseTimer(startTimer(null, '국어', at2(9)), at2(9, 20));
    const { running, session } = switchSubject(r, '영어', at2(9, 25));
    expect(session.seconds).toBe(1200);
    expect(running.startedAt).toBeNull();
    expect(getTotalSeconds(running, at2(9, 40))).toBe(1200);
  });

  it('does nothing when choosing the same subject or without a timer', () => {
    const r = startTimer(null, '국어', at2(9));
    expect(switchSubject(r, '국어', at2(9, 30))).toEqual({ running: r, session: null });
    expect(switchSubject(null, '국어')).toEqual({ running: null, session: null });
  });
});

import { settleAway, getElapsedSeconds as elapsed } from '../src/study/studyLog.js';

describe('안드로이드 앱: 화면 끄기와 다른 앱으로 나가기 구분', () => {
  const t0 = 1_000_000_000_000;
  const running = { subject: '수학', firstStartedAt: t0, startedAt: t0, elapsedBefore: 0, lastSeenAt: t0, hiddenAt: t0 + 600_000 };
  const hidden = t0 + 600_000; // 10분 공부하고 가려짐

  it('가려진 때 화면이 꺼졌으면 계속 잰다 (꺼져 있던 시간 포함)', () => {
    const back = hidden + 1_800_000; // 30분 뒤 화면 켜고 잠금 해제 후 바로 돌아옴
    const r = settleAway(running, hidden, { screenOffAt: hidden + 200, screenOnAt: back - 3000, unlockedAt: back - 1000 }, back);
    expect(r.reason).toBe('screen-off');
    expect(r.running.startedAt).toBe(t0);
    expect('hiddenAt' in r.running).toBe(false);
    expect(elapsed(r.running, back)).toBe(2400);
  });

  it('화면이 안 꺼졌으면 다른 앱으로 나간 것: 가려진 시각에 멈춘다', () => {
    const back = hidden + 1_800_000;
    const r = settleAway(running, hidden, { screenOffAt: 0, screenOnAt: 0, unlockedAt: 0 }, back);
    expect(r.reason).toBe('left');
    expect(r.running.startedAt).toBeNull();
    expect(r.running.elapsedBefore).toBe(600);
    expect(r.running.autoPausedAt).toBe(hidden);
  });

  it('다른 앱으로 나간 뒤 한참 있다가 화면을 꺼도 나간 것으로 본다', () => {
    const r = settleAway(running, hidden, { screenOffAt: hidden + 300_000 }, hidden + 900_000);
    expect(r.reason).toBe('left');
    expect(r.running.elapsedBefore).toBe(600);
  });

  it('화면을 켜고 잠금을 푼 뒤 다른 일을 하다 늦게 돌아오면 잠금 해제 시각에 멈춘다', () => {
    const unlock = hidden + 1_200_000; // 20분 꺼 둠
    const r = settleAway(running, hidden, { screenOffAt: hidden + 100, screenOnAt: unlock - 2000, unlockedAt: unlock }, unlock + 600_000);
    expect(r.reason).toBe('left-after-unlock');
    expect(r.running.elapsedBefore).toBe(1800);
    expect(r.running.autoPausedAt).toBe(unlock);
  });

  it('잠금 없이 화면만 켠 경우 켜진 시각을 쓴다, 휴대폰에 물어볼 수 없으면 나간 것으로 본다', () => {
    const on = hidden + 60_000;
    expect(settleAway(running, hidden, { screenOffAt: hidden, screenOnAt: on, unlockedAt: 0 }, on + 2000).reason).toBe('screen-off');
    expect(settleAway(running, hidden, null, on).reason).toBe('left');
  });

  it('휴대폰 기록: 앱이 뒤로 갈 때 화면이 꺼져 있었으면 화면 끄기 (웹의 가려짐 기록이 늦거나 없어도)', () => {
    const back = hidden + 1_800_000;
    const fromPhone = { pausedAt: hidden, pausedInteractive: false, stoppedAt: hidden + 300, stoppedInteractive: false, screenOffAt: 0, screenOnAt: back - 2000, unlockedAt: back - 1000 };
    // 웹이 '가려짐'을 화면을 다시 켤 때에야 받은 경우
    const late = settleAway({ ...running, hiddenAt: back - 500 }, back - 500, fromPhone, back);
    expect(late.reason).toBe('screen-off');
    expect(elapsed(late.running, back)).toBe(2400);
    // 웹이 '가려짐'을 아예 못 받은 경우
    const { hiddenAt: _h, ...noHidden } = running;
    expect(settleAway(noHidden, undefined, fromPhone, back).reason).toBe('screen-off');
  });

  it('휴대폰 기록: 화면이 켜진 채 뒤로 갔으면 다른 앱 (몇 초 뒤 화면을 꺼도)', () => {
    const r = settleAway(running, hidden, { pausedAt: hidden, pausedInteractive: true, stoppedAt: hidden + 400, stoppedInteractive: true, screenOffAt: hidden + 2500 }, hidden + 1_800_000);
    expect(r.reason).toBe('left');
    expect(r.running.elapsedBefore).toBe(600);
  });

  it('한 번 판단한 자리 비움은 다시 판단하지 않는다', () => {
    const back = hidden + 60_000;
    const phone = { pausedAt: hidden, pausedInteractive: false, stoppedAt: hidden, stoppedInteractive: false, screenOnAt: back - 1000 };
    const first = settleAway(running, hidden, phone, back);
    expect(first.reason).toBe('screen-off');
    expect(settleAway(first.running, undefined, phone, back + 120_000).reason).toBeNull();
  });
});
