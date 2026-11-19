// 계획 탭: 날짜별 할 일 목록

import { $ } from './dom.js';
import { startOfDay, toDateText, daysBetween, formatKoreanDate } from '../utils/date.js';
import { getTarget } from '../exam/target.js';
import { formatDday } from '../exam/dday.js';
import { loadPlans, savePlans } from '../services/planService.js';
import { addPlan, togglePlan, removePlan, planProgress } from '../plan/planList.js';

let userId = null;
let plans = {};
let settings = null;
let viewDate = startOfDay(new Date());

const dateKey = () => toDateText(viewDate);

async function commit(next) {
  plans = next;
  render();
  await savePlans(userId, plans);
}

function render() {
  const today = startOfDay(new Date());
  const diffFromToday = daysBetween(today, viewDate);
  $('plan-date').textContent = formatKoreanDate(viewDate);
  $('plan-relative').textContent =
    diffFromToday === 0 ? '오늘' : diffFromToday === 1 ? '내일' : diffFromToday === -1 ? '어제' : '';
  $('plan-today').hidden = diffFromToday === 0;

  const target = getTarget(settings);
  $('plan-dday').textContent = `${settings.customDate ? '목표일' : '수능'} ${formatDday(daysBetween(viewDate, target.date))}`;

  const items = plans[dateKey()] || [];
  const { done, total } = planProgress(items);
  $('plan-progress').textContent = total ? `${done} / ${total} 완료` : '';
  $('plan-empty').hidden = total > 0;

  const list = $('plan-list');
  list.innerHTML = '';
  for (const item of items) {
    const li = document.createElement('li');
    li.className = `plan-item${item.done ? ' done' : ''}`;
    li.dataset.id = item.id;

    const label = document.createElement('label');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = item.done;
    check.dataset.action = 'toggle';
    const text = document.createElement('span');
    text.textContent = item.text;
    label.append(check, text);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon-btn remove-btn';
    remove.dataset.action = 'remove';
    remove.setAttribute('aria-label', `${item.text} 삭제`);
    remove.textContent = '×';

    li.append(label, remove);
    list.appendChild(li);
  }
}

function moveDays(n) {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() + n);
  render();
}

export function initPlanView() {
  $('plan-prev').addEventListener('click', () => moveDays(-1));
  $('plan-next').addEventListener('click', () => moveDays(1));
  $('plan-today').addEventListener('click', () => {
    viewDate = startOfDay(new Date());
    render();
  });

  $('plan-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $('plan-input');
    if (!input.value.trim()) return;
    commit(addPlan(plans, dateKey(), input.value));
    input.value = '';
    input.focus();
  });

  $('plan-list').addEventListener('click', (event) => {
    const action = event.target.dataset.action;
    const id = event.target.closest('.plan-item')?.dataset.id;
    if (!id || !action) return;
    if (action === 'toggle') commit(togglePlan(plans, dateKey(), id));
    if (action === 'remove') commit(removePlan(plans, dateKey(), id));
  });
}

export async function showPlans(id, nextSettings) {
  userId = id;
  settings = nextSettings;
  viewDate = startOfDay(new Date());
  plans = await loadPlans(id);
  render();
}

export function setPlanSettings(nextSettings) {
  settings = nextSettings;
  if (userId) render();
}

export function clearPlans() {
  userId = null;
  plans = {};
}
