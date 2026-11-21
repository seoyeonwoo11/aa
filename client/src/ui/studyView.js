// 공부 모드 탭: 과목별 타이머, 오늘 공부량, 최근 7일

import { $ } from './dom.js';
import { toDateText } from '../utils/date.js';
import { loadStudy, saveStudy } from '../services/studyService.js';
import { SUBJECT_COLORS } from './statsView.js';
import {
  SUBJECTS, MIN_SESSION_SECONDS, getElapsedSeconds, getTotalSeconds, startTimer, pauseTimer, autoPauseTimer, recoverTimer, finishTimer, settleAway,
  switchSubject, runSummary,
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

function autoPause() {
  if (!isRunning()) return;
  const { hiddenAt, ...running } = data.running;
  data.running = autoPauseTimer(running, hiddenAt ?? Date.now());
  persist(); // localStorage 저장은 즉시 끝나므로 앱이 닫히기 전에 기록된다.
  renderAll();
}

/* ---------- 안드로이드 앱: 화면을 끄면 계속 재고, 다른 앱으로 나가면 멈춘다 ---------- */

// 안드로이드 앱(Capacitor) 안에서 열렸으면 휴대폰에 화면 상태를 물어볼 수 있다.
const nativeApp = () => (window.Capacitor?.isNativePlatform?.() ? window.Capacitor : null);

async function screenState() {
  try {
    return await nativeApp().nativePromise('ScreenState', 'getState', {});
  } catch {
    return null; // 예전 버전 앱 등: 물어볼 수 없으면 다른 앱으로 나간 것으로 본다
  }
}

// 가려질 때는 멈추지 않고 시각만 남긴다. (화면을 끈 것인지는 돌아와서 판단)
function markHidden() {
  if (!isRunning()) return;
  data.running = { ...data.running, hiddenAt: Date.now() };
  persist();
}

async function settleNativeAway() {
  if (!isRunning()) return;
  const hiddenAt = data.running.hiddenAt;
  const screen = await screenState();
  if (!isRunning() || data.running.hiddenAt !== hiddenAt) return; // 그 사이 바뀜
  const { running, reason } = settleAway(data.running, hiddenAt, screen);
  if (!reason) return;
  data.running = running;
  persist();
  renderAll();
  if (reason === 'screen-off') setNotice('화면이 꺼져 있던 동안에도 계속 쟀어요.');
  else showAutoPauseNotice();
}

function showAutoPauseNotice() {
  const at = data?.running?.autoPausedAt;
  if (!at) return;
  const away = Math.max(0, Math.round((Date.now() - at) / 1000));
  setNotice(`앱을 나가서 일시정지했어요.${away >= 60 ? ` (${formatDuration(away)} 동안 자리 비움)` : ''}`);
}

// 안내 문구는 공부 탭과 집중 화면에 같이 보여준다.
function setNotice(text) {
  $('study-notice').textContent = text;
  $('focus-notice').textContent = text;
}

// 과목 버튼: 공부 중에도 눌러서 과목을 바꿀 수 있다. (공부 탭과 집중 화면 둘 다)
function renderChips() {
  const active = data?.running?.subject ?? subject;
  document.querySelectorAll('#subject-chips .chip, #focus-subjects .chip').forEach((chip) => {
    chip.setAttribute('aria-checked', String(chip.dataset.subject === active));
  });
}

function pickSubject(name) {
  if (!data) return;
  if (!data.running) {
    subject = name;
    renderChips();
    return;
  }
  changeSubject(name);
}

// '수학으로', '영어로'처럼 받침에 맞는 조사 (받침이 없거나 ㄹ이면 '로')
function withRo(word) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}(으)로`;
  const jong = code % 28;
  return `${word}${jong === 0 || jong === 8 ? '로' : '으로'}`;
}

// 공부 도중 과목 바꾸기: 그때까지의 시간은 원래 과목으로 기록하고 새 과목으로 이어서 센다.
async function changeSubject(name) {
  setFocusSubjectsOpen(false);
  if (data.running.subject === name) return;
  const before = data.running.subject;
  const { running, session } = switchSubject(data.running, name);
  if (session) data.sessions.push(session);
  data.running = running;
  subject = name;
  setNotice(session
    ? `${before} ${formatDuration(session.seconds)} 기록하고 ${withRo(name)} 바꿨어요.`
    : `${withRo(name)} 바꿨어요.`);
  renderAll();
  await persist();
}

function renderTimer() {
  const running = data.running;
  $('study-timer').textContent = formatClock(getTotalSeconds(running)); // 과목을 바꿔도 이어서
  $('study-timer').classList.toggle('active', isRunning());
  $('study-status').textContent = !running ? '과목을 고르고 시작하세요' : isRunning() ? `${running.subject} 공부 중` : `${running.subject} 일시정지`;
  $('study-start').hidden = isRunning();
  $('study-start').textContent = running ? '계속' : '시작';
  $('study-pause').hidden = !isRunning();
  $('autopause-hint').hidden = !isRunning();
  $('study-stop').hidden = !running;
  $('study-open-focus').hidden = !running || focusOpen;

  // 집중 화면
  if (!focusOpen) return;
  $('focus-subject-name').textContent = running ? running.subject : '';
  $('focus-timer').textContent = formatClock(getTotalSeconds(running));
  $('focus-screen').classList.toggle('paused', !isRunning());
  $('focus-status').textContent = isRunning() ? '공부 중' : '일시정지';
  $('focus-pause').hidden = !isRunning();
  $('focus-resume').hidden = isRunning();
  const now = new Date();
  $('focus-clock').textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
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
  $('goal-text').textContent = `목표 ${goalMinutes / 60}시간 중 ${Math.floor(percent)}%`;
  $('focus-goal-fill').style.width = `${percent}%`;
  $('focus-goal-text').textContent = `오늘 ${formatDuration(todayTotal)} / 목표 ${goalMinutes / 60}시간`;

  const list = $('subject-totals');
  list.innerHTML = '';
  for (const name of SUBJECTS) {
    if (!bySubject[name]) continue;
    const li = document.createElement('li');
    const label = document.createElement('span');
    const value = document.createElement('strong');
    label.textContent = name;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = SUBJECT_COLORS[name];
    label.prepend(swatch);
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
    col.title = `${day.date}: ${formatDuration(day.seconds)}`;
    chart.appendChild(col);
  });
}

/* ---------- 시작·일시정지·종료 (공부 탭과 집중 화면이 같이 씀) ---------- */

async function start() {
  data.running = startTimer(data.running, subject);
  setNotice('');
  keepScreenOn(true);
  renderAll();
  if (focusOpen) $('focus-pause').focus(); // 사라진 버튼 대신 바뀐 버튼으로
  await persist();
}

async function pause() {
  data.running = pauseTimer(data.running);
  keepScreenOn(false);
  renderAll();
  if (focusOpen) $('focus-resume').focus();
  await persist();
}

async function stop() {
  const session = finishTimer(data.running);
  if (session) data.sessions.push(session);
  const parts = runSummary(data.running, session); // 과목을 바꿨다면 과목마다
  data.running = null;
  keepScreenOn(false);
  closeFocus();
  setNotice(parts.length
    ? `${parts.map((p) => `${p.subject} ${formatDuration(p.seconds)}`).join(', ')} 기록했어요.`
    : `${MIN_SESSION_SECONDS / 60}분 미만은 기록하지 않아요.`);
  renderAll();
  await persist();
}

/* ---------- 집중 화면: 하단 탭 없이 타이머만 크게 ---------- */

let focusOpen = false;

function openFocus() {
  if (!data?.running) return;
  focusOpen = true;
  $('focus-screen').hidden = false;
  document.body.classList.add('focus-open');
  renderAll();
  $(isRunning() ? 'focus-pause' : 'focus-resume').focus();
  // 지원하는 기기(안드로이드·PC)에서는 브라우저 주소창까지 숨긴 전체 화면으로
  document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {});
}

function closeFocus() {
  if (!focusOpen) return;
  setFocusSubjectsOpen(false);
  focusOpen = false;
  $('focus-screen').hidden = true;
  document.body.classList.remove('focus-open');
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  if (data) renderAll();
}

function renderAll() {
  renderChips();
  renderTimer();
  renderToday();
  renderWeek();
}

function setFocusSubjectsOpen(open) {
  $('focus-subjects').hidden = !open;
  $('focus-subject').setAttribute('aria-expanded', String(open));
}

export function initStudyView() {
  for (const containerId of ['subject-chips', 'focus-subjects']) {
    const container = $(containerId);
    for (const name of SUBJECTS) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.role = 'radio';
      chip.dataset.subject = name;
      chip.textContent = name;
      chip.addEventListener('click', () => pickSubject(name));
      container.appendChild(chip);
    }
  }
  // 집중 화면: 과목 이름을 누르면 과목 고르기가 열린다.
  $('focus-subject').addEventListener('click', () => setFocusSubjectsOpen($('focus-subjects').hidden));

  // 시작하면 집중 화면으로 들어간다.
  $('study-start').addEventListener('click', () => {
    start();
    openFocus();
  });
  $('study-pause').addEventListener('click', pause);
  $('study-stop').addEventListener('click', stop);
  $('study-open-focus').addEventListener('click', openFocus);

  // 집중 화면 버튼
  $('focus-resume').addEventListener('click', start);
  $('focus-pause').addEventListener('click', pause);
  $('focus-stop').addEventListener('click', stop);
  $('focus-minimize').addEventListener('click', closeFocus);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && focusOpen) closeFocus();
  });

  // 다른 앱에 갔다 오면 화면 켜짐을 다시 요청한다.
  // 앱을 나가면(홈 화면, 다른 앱, 다른 탭, 화면 잠금) 타이머를 자동으로 멈춘다.
  // 안드로이드 앱: 휴대폰 기능과 연결되면 안내 문구를 바꿔, 화면을 꺼도 계속 잰다는 걸 알 수 있게 한다.
  if (nativeApp()) {
    screenState().then((state) => {
      if (state) $('autopause-hint').textContent = '화면을 꺼도 계속 재요. 다른 앱으로 나가면 일시정지돼요.';
    });
  }

  // 안드로이드 앱에서는 화면을 끈 경우 멈추지 않는다(돌아왔을 때 휴대폰에 물어 판단).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (nativeApp()) markHidden();
      else autoPause();
    } else if (nativeApp()) settleNativeAway();
    else showAutoPauseNotice();
  });
  window.addEventListener('pagehide', autoPause);

  setInterval(() => {
    if (!data?.running) return;
    // 강제 종료에 대비해 앱이 살아 있던 마지막 시각을 10초마다 남긴다.
    if (isRunning() && Date.now() - (data.running.lastSeenAt ?? 0) >= 10000) {
      data.running = { ...data.running, lastSeenAt: Date.now() };
      persist();
    }
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
  if (isRunning()) {
    data.running = recoverTimer(data.running);
    await persist();
  }
  setNotice('');
  showAutoPauseNotice();
  renderAll();
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

// 통계용: 저장된 기록 + 지금 진행 중인 타이머(오늘 몫)
export function getStudySessions() {
  if (!data) return [];
  const live = data.running ? getElapsedSeconds(data.running) : 0;
  if (!live) return data.sessions;
  return [...data.sessions, { date: toDateText(new Date()), subject: data.running.subject, seconds: live }];
}

export function clearStudy() {
  autoPause(); // 로그아웃하면 진행 중인 타이머를 멈춘다.
  closeFocus();
  keepScreenOn(false);
  userId = null;
  data = null;
}
