// 공부 모드 탭: 과목별 타이머, 오늘 공부량, 최근 7일

import { $ } from './dom.js';
import { toDateText } from '../utils/date.js';
import { loadStudy, saveStudy } from '../services/studyService.js';
import {
  SUBJECTS, MIN_SESSION_SECONDS, getElapsedSeconds, startTimer, pauseTimer, finishTimer,
  totalsForDate, lastDaysTotals, formatClock, formatDuration
} from '../study/studyLog.js';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

let userId = null;
let data = null;
let goalMinutes = 0;
let subject = SUBJECTS[0];
let wakeLock = null;

const isRunning = () => Boolean(data?.running?.startedAt);

async function persist() {
  await saveStudy(userId, data);
}

// 공부하는 동안 태블릿 화면이 꺼지지 않게 한다. (지원하는 브라우저에서만)
async function keepScreenOn(on) {
  try {
    if (on && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    wakeLock = null;
  }
}

function renderChips() {
  const locked = Boolean(data?.running);
  const active = data?.running?.subject ?? subject;
  document.querySelectorAll('#subject-chips .chip').forEach((chip) => {
    chip.setAttribute('aria-checked', String(chip.dataset.subject === active));
    chip.disabled = locked && chip.dataset.subject !== active;
  });
}

function renderTimer() {
  const running = data.running;
  $('study-timer').textContent = formatClock(getElapsedSeconds(running));
  $('study-timer').classList.toggle('active', isRunning());
  $('study-status').textContent = !running ? '과목을 고르고 시작하세요' : isRunning() ? `${running.subject} 공부 중` : `${running.subject} 일시정지`;
  $('study-start').hidden = isRunning();
  $('study-start').textContent = running ? '계속' : '시작';
  $('study-pause').hidden = !isRunning();
  $('study-stop').hidden = !running;
}

function renderToday() {
  const today = toDateText(new Date());
  const { total, bySubject } = totalsForDate(data.sessions, today);

  // 진행 중인 타이머도 오늘 공부량에 포함해서 보여준다.
  const live = data.running ? getElapsedSeconds(data.running) : 0;
  const liveSubject = data.running?.subject;
  const todayTotal = total + live;
  if (liveSubject) bySubject[liveSubject] = (bySubject[liveSubject] || 0) + live;

  const goalSeconds = goalMinutes * 60;
  const percent = goalSeconds ? Math.min(100, (todayTotal / goalSeconds) * 100) : 0;
  $('today-total').textContent = formatDuration(todayTotal);
  $('goal-fill').style.width = `${percent}%`;
  $('goal-text').textContent = `목표 ${goalMinutes / 60}시간 · ${Math.floor(percent)}%`;

  const list = $('subject-totals');
  list.innerHTML = '';
  for (const name of SUBJECTS) {
    if (!bySubject[name]) continue;
    const li = document.createElement('li');
    const label = document.createElement('span');
    const value = document.createElement('strong');
    label.textContent = name;
    value.textContent = formatDuration(bySubject[name]);
    li.append(label, value);
    list.appendChild(li);
  }
}

function renderWeek() {
  const days = lastDaysTotals(data.sessions, new Date(), 7);
  days[days.length - 1].seconds += data.running ? getElapsedSeconds(data.running) : 0; // 진행 중인 공부 포함
  const max = Math.max(goalMinutes * 60, ...days.map((d) => d.seconds), 1);
  const chart = $('week-chart');
  chart.innerHTML = '';
  days.forEach((day, i) => {
    const col = document.createElement('div');
    col.className = 'week-col';
    const value = document.createElement('span');
    value.className = 'week-value';
    value.textContent = day.seconds ? `${(day.seconds / 3600).toFixed(1)}h` : '';
    const track = document.createElement('div');
    track.className = 'week-track';
    const bar = document.createElement('div');
    bar.className = `week-bar${i === days.length - 1 ? ' today' : ''}`;
    bar.style.height = `${(day.seconds / max) * 100}%`;
    track.appendChild(bar);
    const label = document.createElement('span');
    label.className = 'week-label';
    label.textContent = i === days.length - 1 ? '오늘' : WEEKDAYS[day.weekday];
    col.append(value, track, label);
    col.title = `${day.date} · ${formatDuration(day.seconds)}`;
    chart.appendChild(col);
  });
}

function renderAll() {
  renderChips();
  renderTimer();
  renderToday();
  renderWeek();
}

export function initStudyView() {
  const chips = $('subject-chips');
  for (const name of SUBJECTS) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.role = 'radio';
    chip.dataset.subject = name;
    chip.textContent = name;
    chip.addEventListener('click', () => {
      if (data?.running) return;
      subject = name;
      renderChips();
    });
    chips.appendChild(chip);
  }

  $('study-start').addEventListener('click', async () => {
    data.running = startTimer(data.running, subject);
    $('study-notice').textContent = '';
    keepScreenOn(true);
    renderAll();
    await persist();
  });

  $('study-pause').addEventListener('click', async () => {
    data.running = pauseTimer(data.running);
    keepScreenOn(false);
    renderAll();
    await persist();
  });

  $('study-stop').addEventListener('click', async () => {
    const session = finishTimer(data.running);
    if (session) data.sessions.push(session);
    $('study-notice').textContent = session
      ? `${session.subject} ${formatDuration(session.seconds)} 기록했어요.`
      : `${MIN_SESSION_SECONDS / 60}분 미만은 기록하지 않아요.`;
    data.running = null;
    keepScreenOn(false);
    renderAll();
    await persist();
  });

  // 다른 앱에 갔다 오면 화면 켜짐을 다시 요청한다.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isRunning()) keepScreenOn(true);
  });

  setInterval(() => {
    if (!data?.running) return;
    renderTimer();
    renderToday();
    renderWeek();
  }, 1000);
}

export async function showStudy(id, settings) {
  userId = id;
  goalMinutes = settings.dailyGoalMinutes;
  data = await loadStudy(id);
  if (data.running) subject = data.running.subject;
  $('study-notice').textContent = '';
  renderAll();
  if (isRunning()) keepScreenOn(true);
}

export function setStudySettings(settings) {
  goalMinutes = settings.dailyGoalMinutes;
  if (data) {
    renderToday();
    renderWeek();
  }
}

// 탭을 열 때마다 날짜가 바뀌었을 수 있으니 다시 그린다.
export function refreshStudy() {
  if (data) renderAll();
}

export function clearStudy() {
  keepScreenOn(false);
  userId = null;
  data = null;
}
