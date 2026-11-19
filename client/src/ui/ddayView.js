// 홈 탭: D-Day 카드, 카운트다운, 남은 기간

import { $, pad2 } from './dom.js';
import { toDateText, formatKoreanDate } from '../utils/date.js';
import { getTarget } from '../exam/target.js';
import { formatDday, getSummary, getCountdown } from '../exam/dday.js';

let settings = null;
let lastDay = null;

function renderSummary() {
  const target = getTarget(settings);
  const summary = getSummary(new Date(), target.date, target.previous);

  $('exam-label').textContent = target.label;
  $('exam-badge').textContent = target.badge;
  $('exam-badge').className = `badge${target.badge === '예상' ? ' estimated' : ''}`;
  $('exam-date').textContent = formatKoreanDate(target.date);

  $('dday').textContent = formatDday(summary.diff);
  $('dday').classList.toggle('today', summary.diff === 0);

  $('stat-weeks').textContent = `${summary.weeks}주`;
  $('stat-weekends').textContent = `${summary.weekends}번`;
  $('stat-months').textContent = `${summary.months}개월`;

  $('progress-section').hidden = summary.progress === null;
  if (summary.progress !== null) {
    $('progress-text').textContent = `${summary.progress.toFixed(1)}%`;
    $('progress-fill').style.width = `${summary.progress}%`;
  }
}

function renderCountdown() {
  const cd = getCountdown(new Date(), getTarget(settings).date);
  $('cd-days').textContent = cd.days;
  $('cd-hours').textContent = pad2(cd.hours);
  $('cd-minutes').textContent = pad2(cd.minutes);
  $('cd-seconds').textContent = pad2(cd.seconds);
}

export function setDdaySettings(next) {
  settings = next;
  lastDay = toDateText(new Date());
  renderSummary();
  renderCountdown();
}

export function clearDdayView() {
  settings = null;
}

export function initDdayView() {
  setInterval(() => {
    if (!settings) return;
    renderCountdown();
    const day = toDateText(new Date());
    if (day !== lastDay) {
      lastDay = day; // 자정이 지나면 D-Day를 새로 계산
      renderSummary();
    }
  }, 1000);
}
