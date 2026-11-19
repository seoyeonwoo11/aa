const STORAGE_KEY = 'suneungDdayState';
const EXAM_START_HOUR = 8;
const EXAM_START_MINUTE = 40;

// 교육부가 공식 발표한 수능 날짜. 새 날짜가 발표되면 여기에 추가한다.
const OFFICIAL_DATES = {
  2025: '2024-11-14',
  2026: '2025-11-13',
  2027: '2026-11-19'
};

const $ = (id) => document.getElementById(id);

// 'YYYY-MM-DD'를 로컬 시간 기준 Date로 바꾼다. (toISOString의 UTC 어긋남 방지)
function parseDate(text) {
  const [y, m, d] = text.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toDateText(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// 공식 발표 전에는 11월 셋째 목요일로 추정한다.
function estimateExamDate(calendarYear) {
  const first = new Date(calendarYear, 10, 1);
  const offset = (4 - first.getDay() + 7) % 7; // 4 = 목요일
  return new Date(calendarYear, 10, 1 + offset + 14);
}

// 학년도(예: 2028학년도)는 시험이 치러지는 해 + 1
function getExam(academicYear) {
  const official = OFFICIAL_DATES[academicYear];
  return {
    academicYear,
    date: official ? parseDate(official) : estimateExamDate(academicYear - 1),
    official: Boolean(official)
  };
}

function findUpcomingAcademicYear(today) {
  let year = today.getFullYear() + 1;
  while (getExam(year).date < today) year += 1;
  return year;
}

function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86400000);
}

function countWeekends(from, to) {
  let count = 0;
  const cursor = startOfDay(from);
  while (cursor < to) {
    if (cursor.getDay() === 6) count += 1; // 토요일마다 주말 1번
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function formatKoreanDate(date) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (error) {
    return {};
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // 저장이 막힌 환경(시크릿 모드 등)에서는 저장 없이 계속 동작한다.
  }
}

const today = startOfDay(new Date());
const upcomingYear = findUpcomingAcademicYear(today);
const state = { academicYear: upcomingYear, customDate: '', ...loadState() };
if (state.academicYear < upcomingYear) state.academicYear = upcomingYear;

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

function renderExamOptions() {
  const select = $('exam-select');
  select.innerHTML = '';
  for (let year = upcomingYear; year < upcomingYear + 4; year += 1) {
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
  const now = new Date();
  const diff = daysBetween(now, target.date);

  $('exam-label').textContent = target.label;
  const badge = $('exam-badge');
  badge.textContent = target.badge;
  badge.className = `badge${target.badge === '예상' ? ' estimated' : ''}`;
  $('exam-date').textContent = formatKoreanDate(target.date);

  const dday = $('dday');
  dday.classList.toggle('today', diff === 0);
  if (diff > 0) {
    dday.textContent = `D-${diff}`;
    $('dday-message').textContent = diff <= 100 ? '마지막 스퍼트! 지금까지 잘 해왔어요.' : '오늘 하루도 꾸준히 쌓아가요.';
  } else if (diff === 0) {
    dday.textContent = 'D-DAY';
    $('dday-message').textContent = '오늘이 시험 날입니다. 준비한 만큼 보여주고 오세요!';
  } else {
    dday.textContent = `D+${-diff}`;
    $('dday-message').textContent = '이미 지난 날짜입니다.';
  }

  const remaining = Math.max(diff, 0);
  $('stat-weeks').textContent = `${Math.floor(remaining / 7)}주`;
  $('stat-weekends').textContent = `${countWeekends(now, target.date)}번`;
  $('stat-months').textContent = `${Math.floor(remaining / 30.44)}개월`;

  const progressHead = $('progress-text').parentElement;
  progressHead.parentElement.querySelector('.progress-bar').hidden = !target.previous;
  progressHead.hidden = !target.previous;
  if (target.previous) {
    const total = target.date - target.previous;
    const percent = Math.min(100, Math.max(0, ((now - target.previous) / total) * 100));
    $('progress-text').textContent = `${percent.toFixed(1)}%`;
    $('progress-fill').style.width = `${percent}%`;
  }
}

function renderCountdown() {
  const target = getTarget();
  const start = new Date(target.date);
  start.setHours(EXAM_START_HOUR, EXAM_START_MINUTE, 0, 0);
  const left = Math.max(0, Math.floor((start - new Date()) / 1000));

  $('cd-days').textContent = Math.floor(left / 86400);
  $('cd-hours').textContent = String(Math.floor((left % 86400) / 3600)).padStart(2, '0');
  $('cd-minutes').textContent = String(Math.floor((left % 3600) / 60)).padStart(2, '0');
  $('cd-seconds').textContent = String(left % 60).padStart(2, '0');
}

function render() {
  renderSummary();
  renderCountdown();
}

$('exam-select').addEventListener('change', (event) => {
  state.academicYear = Number(event.target.value);
  state.customDate = '';
  $('custom-date').value = '';
  saveState();
  render();
});

$('custom-date').addEventListener('change', (event) => {
  state.customDate = event.target.value;
  saveState();
  render();
});

$('clear-custom').addEventListener('click', () => {
  state.customDate = '';
  $('custom-date').value = '';
  saveState();
  render();
});

renderExamOptions();
render();

let lastDay = toDateText(new Date());
setInterval(() => {
  renderCountdown();
  const day = toDateText(new Date());
  if (day !== lastDay) {
    lastDay = day;
    renderSummary();
  }
}, 1000);
