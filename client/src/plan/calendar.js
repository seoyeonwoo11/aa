// 달력 계산: 월 격자와 기간 계획 막대 배치

import { toDateText } from '../utils/date.js';
import { compareRanges } from './planList.js';

// 일요일 시작 주 단위 격자. 반환: [[Date x7], ...] (4~6주)
export function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil((first.getDay() + daysInMonth) / 7);
  return Array.from({ length: weekCount }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d))
  );
}

// 한 주(7일) 안에서 기간 계획 막대를 겹치지 않게 줄(lane)에 배치한다.
// 반환: [{ range, lane, from, to }]  from/to는 0~6 (그 주에서 시작·끝 칸)
export function layoutWeek(ranges, week) {
  const first = toDateText(week[0]);
  const last = toDateText(week[6]);
  const dates = week.map(toDateText);
  const laneEnds = [];
  const segments = [];

  for (const range of ranges.filter((r) => r.start <= last && r.end >= first).sort(compareRanges)) {
    const from = range.start <= first ? 0 : dates.indexOf(range.start);
    const to = range.end >= last ? 6 : dates.indexOf(range.end);
    let lane = laneEnds.findIndex((end) => end < from);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = to;
    segments.push({ range, lane, from, to });
  }
  return segments;
}
