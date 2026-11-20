// 달력 계산: 월 격자와 기간 계획 막대 배치

import { toDateText } from '../utils/date.js';
import { compareRanges, rangeActiveOn } from './planList.js';

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
// 요일을 정한 계획은 그 요일이 이어지는 구간마다 막대를 따로 그린다(같은 줄).
// 반환: [{ range, lane, from, to, contLeft, contRight }]
//   from/to는 0~6 (그 주에서 시작·끝 칸), contLeft/Right는 앞 주·다음 주로 이어지는지
export function layoutWeek(ranges, week) {
  const first = toDateText(week[0]);
  const last = toDateText(week[6]);
  const dates = week.map(toDateText);
  const dayBefore = toDateText(new Date(week[0].getFullYear(), week[0].getMonth(), week[0].getDate() - 1));
  const dayAfter = toDateText(new Date(week[6].getFullYear(), week[6].getMonth(), week[6].getDate() + 1));
  const laneEnds = [];
  const segments = [];

  for (const range of ranges.filter((r) => r.start <= last && r.end >= first).sort(compareRanges)) {
    // 이 주에서 계획이 있는 날이 이어지는 구간들
    const runs = [];
    dates.forEach((date, i) => {
      if (!rangeActiveOn(range, date)) return;
      const run = runs[runs.length - 1];
      if (run && run.to === i - 1) run.to = i;
      else runs.push({ from: i, to: i });
    });
    if (!runs.length) continue;

    const from = runs[0].from;
    const to = runs[runs.length - 1].to;
    let lane = laneEnds.findIndex((end) => end < from);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = to;
    for (const run of runs) {
      segments.push({
        range,
        lane,
        from: run.from,
        to: run.to,
        contLeft: run.from === 0 && rangeActiveOn(range, dayBefore),
        contRight: run.to === 6 && rangeActiveOn(range, dayAfter)
      });
    }
  }
  return segments;
}
