// 화면과 무관한 D-Day 계산. 숫자만 돌려주고 표시는 ui/ddayView.js가 맡는다.

import { daysBetween, countWeekends } from '../utils/date.js';
import { getExamStart } from './examDates.js';

export function formatDday(diff) {
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return 'D-DAY';
  return `D+${-diff}`;
}

export function getDdayMessage(diff) {
  if (diff > 100) return '오늘 하루도 꾸준히 쌓아가요.';
  if (diff > 0) return '마지막 스퍼트! 지금까지 잘 해왔어요.';
  if (diff === 0) return '오늘이 시험 날입니다. 준비한 만큼 보여주고 오세요!';
  return '이미 지난 날짜입니다.';
}

// previous가 있으면 지난 시험부터 target까지 몇 % 지났는지(0~100)도 계산한다.
export function getSummary(now, target, previous = null) {
  const diff = daysBetween(now, target);
  const remaining = Math.max(diff, 0);
  const progress = previous
    ? Math.min(100, Math.max(0, ((now - previous) / (target - previous)) * 100))
    : null;

  return {
    diff,
    weeks: Math.floor(remaining / 7),
    weekends: countWeekends(now, target),
    months: Math.floor(remaining / 30.44),
    progress
  };
}

// 1교시 시작까지 남은 시간
export function getCountdown(now, examDate) {
  const left = Math.max(0, Math.floor((getExamStart(examDate) - now) / 1000));
  return {
    days: Math.floor(left / 86400),
    hours: Math.floor((left % 86400) / 3600),
    minutes: Math.floor((left % 3600) / 60),
    seconds: left % 60
  };
}
