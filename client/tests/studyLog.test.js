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
