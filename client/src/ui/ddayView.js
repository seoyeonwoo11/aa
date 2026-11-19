// D-Day 계산기 화면 (D-Day 카드, 남은 기간, 목표 시험 선택)

import { $, pad2 } from './dom.js';
import { parseDate, startOfDay, toDateText, formatKoreanDate } from '../utils/date.js';
import { getExam, getSelectableYears } from '../exam/examDates.js';
import { formatDday, getSummary, getCountdown } from '../exam/dday.js';

let state = null;
let onChange = () => {};
let timerId = null;
let lastDay = null;

export function normalizeSettings(saved, today = startOfDay(new Date())) {
  const years = getSelectableYears(today);
  const first = years[0];
  const last = years[years.length - 1];
  const year = Number(saved?.academicYear) || first;
  return {
    academicYear: Math.min(Math.max(year, first), last),
    customDate: saved?.customDate || ''
  };
}

function getTarget() {
  if (state.customDate) {
    return { label: '직접 입력한 날짜', date: parseDate(state.customDate), badge: '직접 입력', previous: null };
  }
  const exam = getExam(state.academicYear);
  return {
    label: `${exam.academicYear}학년도 수능`,
    date: exam.date,
    badge: exam.official ? '확정' : '예상',
    previous: getExam(exam.academicYear - 1).date
  };
}

function renderOptions() {
  const select = $('exam-select');
  select.innerHTML = '';
  for (const year of getSelectableYears(startOfDay(new Date()))) {
    const exam = getExam(year);
    const option = document.createElement('option');
    option.value = year;
    option.textContent = `${year}학년도 · ${formatKoreanDate(exam.date)}${exam.official ? '' : ' (예상)'}`;
    select.appendChild(option);
  }
  select.value = state.academicYear;
  $('custom-date').value = state.customDate;
}

function renderSummary() {
  const target = getTarget();
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
  const cd = getCountdown(new Date(), getTarget().date);
  $('cd-days').textContent = cd.days;
  $('cd-hours').textContent = pad2(cd.hours);
  $('cd-minutes').textContent = pad2(cd.minutes);
  $('cd-seconds').textContent = pad2(cd.seconds);
}

function update(patch) {
  state = { ...state, ...patch };
  onChange(state);
  render();
}

function render() {
  renderSummary();
  renderCountdown();
}

export function initDdayView({ onSettingsChange }) {
  onChange = onSettingsChange;

  $('exam-select').addEventListener('change', (event) => {
    $('custom-date').value = '';
    update({ academicYear: Number(event.target.value), customDate: '' });
  });
  $('custom-date').addEventListener('change', (event) => update({ customDate: event.target.value }));
  $('clear-custom').addEventListener('click', () => {
    $('custom-date').value = '';
    update({ customDate: '' });
  });
}

export function showDdayView(settings) {
  state = normalizeSettings(settings);
  $('app-content').hidden = false;
  renderOptions();
  render();

  lastDay = toDateText(new Date());
  clearInterval(timerId);
  timerId = setInterval(() => {
    renderCountdown();
    const day = toDateText(new Date());
    if (day !== lastDay) {
      lastDay = day; // 자정이 지나면 D-Day와 선택지를 새로 계산
      renderOptions();
      renderSummary();
    }
  }, 1000);
}

export function hideDdayView() {
  clearInterval(timerId);
  state = null;
  $('app-content').hidden = true;
}
