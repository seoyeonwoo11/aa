// 계획 탭: 월 달력 + 기간 계획 + 날짜별 상세 계획(할 일)

import { $ } from './dom.js';
import { readJSON, writeJSON } from '../storage/localStore.js';
import { toDateText, parseDate, formatKoreanDate } from '../utils/date.js';
import { getTarget } from '../exam/target.js';
import { mockExamsByDate } from '../exam/mockExams.js';
import { loadPlans, savePlans } from '../services/planService.js';
import { getMonthGrid, layoutWeek } from '../plan/calendar.js';
import {
  RANGE_COLORS, REPEAT_PRESETS, addPlan, togglePlan, removePlan, planProgress,
  addRepeat, toggleRepeatDone, stopRepeat, itemsForDate, setMemo, memoFor,
  addRange, updateRange, toggleRange, removeRange, rangesOnDate, rangeDayInfo
} from '../plan/planList.js';

const MAX_LANES = 3; // 한 칸에 보이는 기간 계획 막대 수 (넘치면 +n)
const EXPANDED_KEY = 'suneungDday:calendarExpanded';

// 휴대폰에서는 달력을 선택한 주 한 줄로 접어 두고, 필요할 때 한 달로 펼친다.
const compactQuery = window.matchMedia('(max-width: 699px)');
let expanded = readJSON(EXPANDED_KEY, false) === true;

let userId = null;
let plans = { days: {}, ranges: [] };
let settings = null;
let selected = toDateText(new Date()); // 상세 계획을 보는 날짜
let month = { year: 0, month: 0 }; // 달력에 보이는 달

// 기간 계획 편집 상태: null이면 닫힘
// { id: 수정 중인 계획 id 또는 null, start, end, color, picking: 'start' | 'end' }
let editing = null;

// 지금 달력이 한 주만 보이는 상태인지 (기간 계획을 고를 때는 항상 한 달)
const isCollapsed = () => compactQuery.matches && !expanded && !editing;

function setExpanded(next) {
  if (expanded === next) return;
  expanded = next;
  writeJSON(EXPANDED_KEY, expanded);
  if (!expanded) showMonthOf(selected); // 접을 때는 선택한 날이 있는 주로
  render();
}

async function commit(next) {
  plans = next;
  render();
  await savePlans(userId, plans);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const shortDate = (text) => {
  const d = parseDate(text);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

/* ---------- 달력 ---------- */

function renderCalendar() {
  const today = toDateText(new Date());
  const examDate = settings && !settings.customDate ? toDateText(getTarget(settings).date) : null;
  const customDate = settings?.customDate || null;
  const mocks = settings ? mockExamsByDate(settings) : {};
  const weeks = getMonthGrid(month.year, month.month);
  const preview = editing?.start && editing?.end
    ? [editing.start, editing.end].sort()
    : editing?.start ? [editing.start, editing.start] : null;

  $('cal-title').textContent = `${month.year}년 ${month.month + 1}월`;
  const grid = $('cal-grid');
  grid.innerHTML = '';
  grid.classList.toggle('picking', Boolean(editing));
  grid.classList.toggle('collapsed', isCollapsed());

  const collapsed = isCollapsed();
  $('cal-prev').setAttribute('aria-label', collapsed ? '이전 주' : '이전 달');
  $('cal-next').setAttribute('aria-label', collapsed ? '다음 주' : '다음 달');
  $('cal-toggle').hidden = !compactQuery.matches || Boolean(editing);
  $('cal-toggle').setAttribute('aria-expanded', String(!collapsed));
  $('cal-toggle').setAttribute('aria-label', collapsed ? '한 달 보기' : '접기');

  for (const week of weeks) {
    const wrap = el('div', 'cal-week-wrap');
    if (week.some((d) => toDateText(d) === selected)) wrap.classList.add('current');
    const row = el('div', 'cal-week');
    wrap.append(row);
    const segments = layoutWeek(plans.ranges, week);

    week.forEach((day, i) => {
      const date = toDateText(day);
      const items = itemsForDate(plans, date);
      const hidden = segments.filter((s) => s.lane >= MAX_LANES && s.from <= i && i <= s.to).length;

      const cell = el('button', 'cal-cell');
      cell.type = 'button';
      cell.dataset.date = date;
      cell.style.gridColumn = String(i + 1);
      if (day.getMonth() !== month.month) cell.classList.add('outside');
      if (day.getDay() === 0) cell.classList.add('sun');
      if (day.getDay() === 6) cell.classList.add('sat');
      if (date === today) cell.classList.add('today');
      if (date === selected && !editing) cell.classList.add('selected');
      if (preview && preview[0] <= date && date <= preview[1]) cell.classList.add('in-range');

      const head = el('span', 'cal-cell-head');
      head.append(el('span', 'cal-num', String(day.getDate())));
      const hasMemo = Boolean(memoFor(plans, date));
      if (hasMemo) {
        cell.classList.add('has-memo');
        cell.append(memoIcon()); // 칸 오른쪽 위의 노란 포스트잇
      }
      if (date === examDate) head.append(el('span', 'cal-tag', '수능'));
      else if (date === customDate) head.append(el('span', 'cal-tag', '목표'));
      for (const mock of mocks[date] || []) head.append(el('span', 'cal-tag mock', mock.short));
      cell.append(head);

      const foot = el('span', 'cal-cell-foot');
      if (hidden) foot.append(el('span', 'cal-more', `+${hidden}`));
      if (items.length) {
        const { done, total } = planProgress(items);
        foot.append(el('span', `cal-todo${done === total ? ' all-done' : ''}`, `${done}/${total}`));
      }
      cell.append(foot);

      const dayRanges = rangesOnDate(plans.ranges, date).length;
      cell.setAttribute('aria-label', [
        formatKoreanDate(day),
        dayRanges ? `기간 계획 ${dayRanges}개` : '',
        items.length ? `할 일 ${items.length}개` : '',
        hasMemo ? '메모 있음' : ''
      ].filter(Boolean).join(', '));
      row.append(cell);
    });

    // 날 사이 구분선 (선택한 날의 양옆은 테두리와 겹치지 않게 뺀다)
    const selectedIndex = editing ? -1 : week.findIndex((d) => toDateText(d) === selected);
    for (let i = 1; i < 7; i++) {
      if (selectedIndex !== -1 && (i === selectedIndex || i === selectedIndex + 1)) continue;
      const divider = el('span', 'cal-divider');
      divider.style.gridColumn = String(i + 1);
      divider.setAttribute('aria-hidden', 'true');
      row.append(divider);
    }

    for (const seg of segments) {
      if (seg.lane >= MAX_LANES) continue;
      const { range } = seg;
      const bar = el('div', `cal-bar${range.done ? ' done' : ''}`, range.title);
      bar.style.gridColumn = `${seg.from + 1} / ${seg.to + 2}`;
      bar.style.gridRow = String(seg.lane + 2);
      bar.style.setProperty('--bar', range.color);
      if (toDateText(week[seg.from]) !== range.start) bar.classList.add('cont-left');
      if (toDateText(week[seg.to]) !== range.end) bar.classList.add('cont-right');
      bar.setAttribute('aria-hidden', 'true');
      row.append(bar);
    }
    grid.append(wrap);
  }
}

/* ---------- 목록 그리기 (계획 탭과 홈 화면이 함께 씀) ---------- */

// 기간 계획 한 줄. editable이면 눌러서 수정할 수 있다.
function rangeItem(range, date, editable) {
  const { day: n, total } = rangeDayInfo(range, date);
  const li = el('li', `range-item${range.done ? ' done' : ''}`);
  li.dataset.id = range.id;
  li.style.setProperty('--bar', range.color);

  const check = el('input');
  check.type = 'checkbox';
  check.checked = range.done;
  check.dataset.action = 'toggle-range';
  check.setAttribute('aria-label', `${range.title} 완료`);

  const body = el(editable ? 'button' : 'div', 'range-body');
  if (editable) {
    body.type = 'button';
    body.dataset.action = 'edit-range';
  }
  body.append(
    el('span', 'range-title', range.title),
    el('span', 'range-meta', `${shortDate(range.start)} ~ ${shortDate(range.end)} · ${n}/${total}일째`)
  );
  li.append(el('span', 'range-color'), check, body);
  return li;
}

// 할 일 한 줄. removable이면 삭제 버튼을 붙인다. 반복 할 일에는 반복 요일 표시.
function todoItem(item, removable) {
  const li = el('li', `plan-item${item.done ? ' done' : ''}${item.repeat ? ' repeat' : ''}`);
  li.dataset.id = item.id;
  if (item.repeat) li.dataset.repeat = '1';
  const label = el('label');
  const check = el('input');
  check.type = 'checkbox';
  check.checked = item.done;
  check.dataset.action = 'toggle';
  label.append(check, el('span', 'plan-text', item.text));
  if (item.repeat) label.append(el('span', 'repeat-tag', `↻ ${item.repeatLabel}`));
  li.append(label);
  if (removable) {
    const remove = el('button', 'icon-btn remove-btn', '×');
    remove.type = 'button';
    remove.dataset.action = 'remove';
    remove.setAttribute('aria-label', item.repeat ? `${item.text} 반복 그만하기` : `${item.text} 삭제`);
    li.append(remove);
  }
  return li;
}

/* ---------- 선택한 날의 상세 ---------- */

function renderDay() {
  $('plan-date').textContent = formatKoreanDate(parseDate(selected));
  renderMemo();
  $('day-ranges').replaceChildren(...rangesOnDate(plans.ranges, selected).map((r) => rangeItem(r, selected, true)));

  const items = itemsForDate(plans, selected);
  $('plan-empty').hidden = items.length > 0;
  $('plan-list').replaceChildren(...items.map((item) => todoItem(item, true)));
}

/* ---------- 날짜별 메모 ---------- */

// 노란 포스트잇 (오른쪽 아래 모서리가 살짝 접힌 모양)
export const POSTIT_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="postit-paper" d="M2 2h12v8.5L10.5 14H2z"/><path class="postit-fold" d="M14 10.5h-3.5V14z"/><path class="postit-line" d="M4.5 5.5h7M4.5 8h5"/></svg>';

function memoIcon() {
  const icon = el('span', 'cal-memo');
  icon.innerHTML = POSTIT_SVG; // 고정된 아이콘 모양 (사용자 글 아님)
  return icon;
}

let memoDate = null; // 지금 메모를 고치고 있는 날짜 (없으면 null)
let memoTimer = null;

function renderMemo() {
  // 다른 날을 고르면 쓰던 메모를 저장하고 편집을 닫는다.
  if (memoDate && memoDate !== selected) saveMemoNow(true);
  const memo = memoFor(plans, selected);
  const editing = memoDate === selected;
  $('memo-view').hidden = !memo || editing;
  $('memo-view').textContent = memo;
  $('memo-editor').hidden = !editing;
  $('memo-btn').hidden = editing;
  $('memo-btn').classList.toggle('has-memo', Boolean(memo));
  $('memo-btn').setAttribute('aria-expanded', String(editing));
}

function openMemo() {
  memoDate = selected;
  $('memo-input').value = memoFor(plans, selected);
  $('memo-status').textContent = '';
  renderMemo();
  const input = $('memo-input');
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

// 쓰는 동안 잠깐 멈추면 저장한다.
function scheduleMemoSave() {
  clearTimeout(memoTimer);
  $('memo-status').textContent = '';
  memoTimer = setTimeout(() => saveMemoNow(false), 600);
}

function saveMemoNow(close) {
  clearTimeout(memoTimer);
  if (!memoDate) return;
  const date = memoDate;
  if (close) memoDate = null;
  const text = $('memo-input').value;
  if (text.replace(/\s+$/, '') !== memoFor(plans, date)) {
    commit(setMemo(plans, date, text));
    if (!close) $('memo-status').textContent = '저장됨';
  } else if (close) {
    render();
  }
}

function initMemo() {
  $('memo-btn').addEventListener('click', openMemo);
  $('memo-view').addEventListener('click', openMemo);
  $('memo-input').addEventListener('input', scheduleMemoSave);
  $('memo-done').addEventListener('click', () => saveMemoNow(true));
  $('memo-delete').addEventListener('click', () => {
    if (!memoFor(plans, memoDate) && !$('memo-input').value.trim()) return saveMemoNow(true);
    if (!confirm('이 날의 메모를 지울까요?')) return;
    $('memo-input').value = '';
    saveMemoNow(true);
  });
}

/* ---------- 홈 화면의 오늘 계획 ---------- */

function renderHome() {
  const today = toDateText(new Date());
  const ranges = rangesOnDate(plans.ranges, today);
  const items = itemsForDate(plans, today);
  $('home-ranges').replaceChildren(...ranges.map((r) => rangeItem(r, today, false)));
  $('home-plan-list').replaceChildren(...items.map((item) => todoItem(item, false)));
  $('home-plan-empty').hidden = ranges.length + items.length > 0;
}

/* ---------- 기간 계획 편집 ---------- */

function renderRangeForm() {
  const form = $('range-form');
  form.hidden = !editing;
  $('panel-plan').classList.toggle('editing', Boolean(editing));
  $('range-add').hidden = Boolean(editing);
  if (!editing) return;

  $('range-form-title').textContent = editing.id ? '기간 계획 수정' : '기간 계획 추가';
  $('range-delete').hidden = !editing.id;
  $('range-start').value = editing.start || '';
  $('range-end').value = editing.end || '';
  $('range-pick-hint').textContent = editing.picking === 'start'
    ? '달력에서 시작일을 누르세요.'
    : '달력에서 종료일을 누르세요.';
  document.querySelectorAll('#range-colors .color-option').forEach((btn) => {
    btn.setAttribute('aria-checked', String(btn.dataset.color === editing.color));
  });
}

function openRangeForm(range) {
  editing = range
    ? { id: range.id, start: range.start, end: range.end, color: range.color, picking: 'start' }
    : { id: null, start: '', end: '', color: RANGE_COLORS[plans.ranges.length % RANGE_COLORS.length], picking: 'start' };
  $('range-title').value = range?.title ?? '';
  $('range-error').textContent = '';
  render();
  $('range-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (!range) $('range-title').focus({ preventScroll: true });
}

function closeRangeForm() {
  editing = null;
  render();
}

// 편집 중에 달력 칸을 누르면 시작일 → 종료일 순서로 채운다.
function pickDate(date) {
  if (editing.picking === 'start') {
    editing.start = date;
    if (!editing.end || editing.end < date) editing.end = date;
    editing.picking = 'end';
  } else {
    if (date < editing.start) {
      editing.end = editing.start;
      editing.start = date;
    } else {
      editing.end = date;
    }
    editing.picking = 'start';
  }
  render();
}

/* ---------- 공통 ---------- */

function render() {
  if (!settings) return;
  renderCalendar();
  renderRangeForm();
  renderDay();
  renderHome();
}

function showMonthOf(dateText) {
  const d = parseDate(dateText);
  month = { year: d.getFullYear(), month: d.getMonth() };
}

// 접힌 상태에서는 화살표가 한 주씩 움직인다. (선택한 날도 같은 요일로 이동)
function moveWeek(n) {
  const d = parseDate(selected);
  selected = toDateText(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n * 7));
  showMonthOf(selected);
  render();
}

function moveMonth(n) {
  const d = new Date(month.year, month.month + n, 1);
  month = { year: d.getFullYear(), month: d.getMonth() };
  render();
}

export function initPlanView() {
  initMemo();
  initHomeCard();
  $('cal-prev').addEventListener('click', () => (isCollapsed() ? moveWeek(-1) : moveMonth(-1)));
  $('cal-next').addEventListener('click', () => (isCollapsed() ? moveWeek(1) : moveMonth(1)));

  // 손잡이: 누르면 펼치기/접기, 아래로 끌면 펼치고 위로 끌면 접는다.
  const toggle = $('cal-toggle');
  let dragStartY = null;
  let dragged = false;
  toggle.addEventListener('pointerdown', (e) => {
    dragStartY = e.clientY;
    dragged = false;
    toggle.setPointerCapture(e.pointerId);
  });
  toggle.addEventListener('pointermove', (e) => {
    if (dragStartY === null) return;
    const dy = e.clientY - dragStartY;
    if (Math.abs(dy) < 24) return;
    dragged = true;
    dragStartY = null;
    setExpanded(dy > 0);
  });
  const endDrag = () => { dragStartY = null; };
  toggle.addEventListener('pointerup', endDrag);
  toggle.addEventListener('pointercancel', endDrag);
  toggle.addEventListener('click', () => {
    if (dragged) { dragged = false; return; }
    setExpanded(isCollapsed()); // 접혀 있으면 펼치고, 펼쳐져 있으면 접는다
  });
  compactQuery.addEventListener('change', () => render());

  $('cal-grid').addEventListener('click', (event) => {
    const cell = event.target.closest('.cal-cell');
    if (!cell) return;
    const date = cell.dataset.date;
    if (editing) {
      pickDate(date);
      return;
    }
    selected = date;
    if (cell.classList.contains('outside')) showMonthOf(date);
    render();
    if (!isCollapsed() && window.matchMedia('(max-width: 959px)').matches) {
      $('day-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // 기간 계획 폼
  for (const color of RANGE_COLORS) {
    const btn = el('button', 'color-option');
    btn.type = 'button';
    btn.role = 'radio';
    btn.dataset.color = color;
    btn.style.setProperty('--bar', color);
    btn.setAttribute('aria-label', `색 ${RANGE_COLORS.indexOf(color) + 1}`);
    btn.addEventListener('click', () => {
      editing.color = color;
      renderRangeForm();
    });
    $('range-colors').append(btn);
  }

  $('range-add').addEventListener('click', () => openRangeForm(null));
  $('range-cancel').addEventListener('click', closeRangeForm);
  $('range-start').addEventListener('change', (e) => { editing.start = e.target.value; editing.picking = 'end'; render(); });
  $('range-end').addEventListener('change', (e) => { editing.end = e.target.value; editing.picking = 'start'; render(); });

  $('range-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = { title: $('range-title').value, start: editing.start, end: editing.end, color: editing.color };
    try {
      const next = editing.id ? updateRange(plans, editing.id, data) : addRange(plans, data);
      editing = null;
      commit(next);
    } catch (error) {
      $('range-error').textContent = error.message;
    }
  });

  $('range-delete').addEventListener('click', () => {
    const range = plans.ranges.find((r) => r.id === editing.id);
    if (!range || !confirm(`'${range.title}' 기간 계획을 삭제할까요?`)) return;
    editing = null;
    commit(removeRange(plans, range.id));
  });

  // 선택한 날의 기간 계획
  $('day-ranges').addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    const id = event.target.closest('.range-item')?.dataset.id;
    if (!id) return;
    if (action === 'toggle-range') commit(toggleRange(plans, id));
    if (action === 'edit-range') openRangeForm(plans.ranges.find((r) => r.id === id));
  });

  // 선택한 날의 할 일
  $('plan-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $('plan-input');
    if (!input.value.trim()) return;
    if (repeatDays.length) {
      commit(addRepeat(plans, { text: input.value, days: repeatDays, start: selected }));
      setRepeatDays([]);
      setRepeatOpen(false);
    } else {
      commit(addPlan(plans, selected, input.value));
    }
    input.value = '';
    input.focus();
  });

  $('plan-list').addEventListener('click', (event) => {
    const action = event.target.dataset.action;
    const row = event.target.closest('.plan-item');
    if (!row || !action) return;
    const { id, repeat } = row.dataset;
    if (action === 'toggle') commit(toggleItem(selected, id, Boolean(repeat)));
    if (action === 'remove') {
      if (!repeat) return commit(removePlan(plans, selected, id));
      const rule = plans.repeats.find((r) => r.id === id);
      const when = formatKoreanDate(parseDate(selected));
      if (rule && confirm(`'${rule.text}' 반복을 ${when}부터 그만할까요?`)) commit(stopRepeat(plans, id, selected));
    }
  });

  initRepeatPicker();
}

function toggleItem(date, id, isRepeat) {
  return isRepeat ? toggleRepeatDone(plans, date, id) : togglePlan(plans, date, id);
}

/* ---------- 반복 요일 고르기 (할 일 추가 칸 옆 ↻ 버튼) ---------- */

let repeatDays = [];

function setRepeatOpen(open) {
  $('repeat-panel').hidden = !open;
  $('repeat-toggle').setAttribute('aria-expanded', String(open));
}

function setRepeatDays(days) {
  repeatDays = [...new Set(days)].sort();
  const key = repeatDays.join(',');
  document.querySelectorAll('#repeat-days .day-chip').forEach((chip) => {
    chip.setAttribute('aria-pressed', String(repeatDays.includes(Number(chip.dataset.day))));
  });
  document.querySelectorAll('#repeat-presets .day-chip').forEach((chip) => {
    chip.setAttribute('aria-pressed', String(REPEAT_PRESETS[chip.dataset.preset].join(',') === key));
  });
  $('repeat-toggle').classList.toggle('active', repeatDays.length > 0);
  $('plan-input').placeholder = repeatDays.length ? '반복할 일 추가' : '이 날 할 일 추가';
}

function initRepeatPicker() {
  const names = ['일', '월', '화', '수', '목', '금', '토'];
  const presets = { daily: '매일', weekdays: '평일', weekend: '주말' };
  for (const [key, label] of Object.entries(presets)) {
    const chip = el('button', 'day-chip', label);
    chip.type = 'button';
    chip.dataset.preset = key;
    chip.addEventListener('click', () => {
      const same = REPEAT_PRESETS[key].join(',') === repeatDays.join(',');
      setRepeatDays(same ? [] : REPEAT_PRESETS[key]);
    });
    $('repeat-presets').append(chip);
  }
  [1, 2, 3, 4, 5, 6, 0].forEach((day) => {
    const chip = el('button', `day-chip${day === 0 ? ' sun' : day === 6 ? ' sat' : ''}`, names[day]);
    chip.type = 'button';
    chip.dataset.day = String(day);
    chip.addEventListener('click', () => {
      setRepeatDays(repeatDays.includes(day) ? repeatDays.filter((d) => d !== day) : [...repeatDays, day]);
    });
    $('repeat-days').append(chip);
  });
  $('repeat-toggle').addEventListener('click', () => {
    const open = $('repeat-panel').hidden;
    setRepeatOpen(open);
    if (open && !repeatDays.length) setRepeatDays(REPEAT_PRESETS.daily);
    if (!open) setRepeatDays([]);
  });
  setRepeatDays([]);
}

// 홈 화면의 오늘 계획: 체크와 추가만 하고, 자세한 편집은 계획 탭에서 한다.
function initHomeCard() {
  const today = () => toDateText(new Date());

  $('home-plan-more').addEventListener('click', () => {
    selected = today();
    showMonthOf(selected);
    render();
    location.hash = 'plan';
  });

  $('home-ranges').addEventListener('click', (event) => {
    const id = event.target.closest('.range-item')?.dataset.id;
    if (id && event.target.dataset.action === 'toggle-range') commit(toggleRange(plans, id));
  });

  $('home-plan-list').addEventListener('click', (event) => {
    const row = event.target.closest('.plan-item');
    if (row && event.target.dataset.action === 'toggle') commit(toggleItem(today(), row.dataset.id, Boolean(row.dataset.repeat)));
  });

  $('home-plan-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $('home-plan-input');
    if (!input.value.trim()) return;
    commit(addPlan(plans, today(), input.value));
    input.value = '';
  });
}

// 탭을 열 때마다 다시 그린다. (자정이 지나 '오늘'이 바뀌었을 수 있음)
export function refreshPlans() {
  if (userId) render();
}

export async function showPlans(id, nextSettings) {
  userId = id;
  settings = nextSettings;
  selected = toDateText(new Date());
  showMonthOf(selected);
  editing = null;
  plans = await loadPlans(id);
  render();
}

export function setPlanSettings(nextSettings) {
  settings = nextSettings;
  if (userId) render();
}

// 통계용
export function getPlans() {
  return plans;
}

export function clearPlans() {
  userId = null;
  settings = null;
  editing = null;
  plans = { days: {}, ranges: [] };
}
