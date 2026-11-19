// 계획 탭: 월 달력 + 기간 계획 + 날짜별 상세 계획(할 일)

import { $ } from './dom.js';
import { readJSON, writeJSON } from '../storage/localStore.js';
import { toDateText, parseDate, formatKoreanDate } from '../utils/date.js';
import { getTarget } from '../exam/target.js';
import { loadPlans, savePlans } from '../services/planService.js';
import { getMonthGrid, layoutWeek } from '../plan/calendar.js';
import {
  RANGE_COLORS, addPlan, togglePlan, removePlan, planProgress,
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
      const items = plans.days[date] || [];
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
      if (date === examDate) head.append(el('span', 'cal-tag', '수능'));
      else if (date === customDate) head.append(el('span', 'cal-tag', '목표'));
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
        items.length ? `할 일 ${items.length}개` : ''
      ].filter(Boolean).join(', '));
      row.append(cell);
    });

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

// 할 일 한 줄. removable이면 삭제 버튼을 붙인다.
function todoItem(item, removable) {
  const li = el('li', `plan-item${item.done ? ' done' : ''}`);
  li.dataset.id = item.id;
  const label = el('label');
  const check = el('input');
  check.type = 'checkbox';
  check.checked = item.done;
  check.dataset.action = 'toggle';
  label.append(check, el('span', '', item.text));
  li.append(label);
  if (removable) {
    const remove = el('button', 'icon-btn remove-btn', '×');
    remove.type = 'button';
    remove.dataset.action = 'remove';
    remove.setAttribute('aria-label', `${item.text} 삭제`);
    li.append(remove);
  }
  return li;
}

/* ---------- 선택한 날의 상세 ---------- */

function renderDay() {
  $('plan-date').textContent = formatKoreanDate(parseDate(selected));
  $('day-ranges').replaceChildren(...rangesOnDate(plans.ranges, selected).map((r) => rangeItem(r, selected, true)));

  const items = plans.days[selected] || [];
  $('plan-empty').hidden = items.length > 0;
  $('plan-list').replaceChildren(...items.map((item) => todoItem(item, true)));
}

/* ---------- 홈 화면의 오늘 계획 ---------- */

function renderHome() {
  const today = toDateText(new Date());
  const ranges = rangesOnDate(plans.ranges, today);
  const items = plans.days[today] || [];
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
  $('cal-today').addEventListener('click', () => {
    selected = toDateText(new Date());
    showMonthOf(selected);
    render();
  });

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
    commit(addPlan(plans, selected, input.value));
    input.value = '';
    input.focus();
  });

  $('plan-list').addEventListener('click', (event) => {
    const action = event.target.dataset.action;
    const id = event.target.closest('.plan-item')?.dataset.id;
    if (!id || !action) return;
    if (action === 'toggle') commit(togglePlan(plans, selected, id));
    if (action === 'remove') commit(removePlan(plans, selected, id));
  });
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
    const id = event.target.closest('.plan-item')?.dataset.id;
    if (id && event.target.dataset.action === 'toggle') commit(togglePlan(plans, today(), id));
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

export function clearPlans() {
  userId = null;
  settings = null;
  editing = null;
  plans = { days: {}, ranges: [] };
}
