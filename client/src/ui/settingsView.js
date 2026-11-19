// 설정 탭: 목표(수능 학년도·직접 입력 날짜·하루 공부 시간), 모의고사 일정, 계정

import { $ } from './dom.js';
import { startOfDay, parseDate, formatKoreanDate } from '../utils/date.js';
import { getExam, getSelectableYears } from '../exam/examDates.js';
import { getMockExams, isDateText } from '../exam/mockExams.js';
import { GOAL_OPTIONS } from '../settings/settings.js';

let settings = null;
let onChange = () => {};

const STATUS_LABEL = { official: '확정', estimated: '예상', edited: '수정함', custom: '추가함' };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function update(patch) {
  settings = { ...settings, ...patch };
  onChange(settings);
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
  select.value = settings.academicYear;
  $('custom-date').value = settings.customDate;
  $('goal-select').value = settings.dailyGoalMinutes;
}

// 모의고사 목록: 6월·9월 모의평가는 날짜만 고칠 수 있고, 직접 추가한 시험은 지울 수 있다.
function renderMocks() {
  const list = $('mock-list');
  list.replaceChildren(...getMockExams(settings).map((exam) => {
    const li = el('li', `mock-item ${exam.status}`);
    li.dataset.id = exam.id;
    li.dataset.preset = exam.preset ? '1' : '';

    const info = el('div', 'mock-info');
    const title = el('span', 'mock-name', exam.name);
    const badge = el('span', `badge${exam.status === 'estimated' ? ' estimated' : ''}`, STATUS_LABEL[exam.status]);
    info.append(title, badge);

    const date = el('input', 'mock-date');
    date.type = 'date';
    date.value = exam.date;
    date.dataset.action = 'date';
    date.setAttribute('aria-label', `${exam.name} 날짜`);

    li.append(info, date);
    if (exam.status === 'edited') {
      const reset = el('button', 'icon-btn mock-action', '↺');
      reset.type = 'button';
      reset.dataset.action = 'reset';
      reset.title = '예상 날짜로 되돌리기';
      reset.setAttribute('aria-label', `${exam.name} 날짜 되돌리기`);
      li.append(reset);
    } else if (!exam.preset) {
      const remove = el('button', 'icon-btn mock-action remove-btn', '×');
      remove.type = 'button';
      remove.dataset.action = 'remove';
      remove.setAttribute('aria-label', `${exam.name} 삭제`);
      li.append(remove);
    }
    return li;
  }));
}

export function showSettings(next, user) {
  settings = next;
  $('user-name').textContent = user.email;
  renderOptions();
  renderMocks();
}

export function initSettingsView({ onChange: handleChange, onLogout }) {
  onChange = handleChange;
  const goal = $('goal-select');
  for (const minutes of GOAL_OPTIONS) {
    const option = document.createElement('option');
    option.value = minutes;
    option.textContent = `${minutes / 60}시간`;
    goal.appendChild(option);
  }

  $('exam-select').addEventListener('change', (event) => {
    $('custom-date').value = '';
    update({ academicYear: Number(event.target.value), customDate: '' });
    renderMocks(); // 학년도가 바뀌면 모의평가 날짜도 바뀐다
  });
  $('custom-date').addEventListener('change', (event) => update({ customDate: event.target.value }));
  $('clear-custom').addEventListener('click', () => {
    $('custom-date').value = '';
    update({ customDate: '' });
  });
  goal.addEventListener('change', (event) => update({ dailyGoalMinutes: Number(event.target.value) }));

  // 모의고사 날짜 고치기·되돌리기·삭제
  $('mock-list').addEventListener('change', (event) => {
    if (event.target.dataset.action !== 'date') return;
    const row = event.target.closest('.mock-item');
    const value = event.target.value;
    if (!isDateText(value)) return renderMocks();
    if (row.dataset.preset) {
      update({ mockOverrides: { ...settings.mockOverrides, [row.dataset.id]: value } });
    } else {
      update({ customExams: settings.customExams.map((e) => (e.id === row.dataset.id ? { ...e, date: value } : e)) });
    }
    renderMocks();
  });
  $('mock-list').addEventListener('click', (event) => {
    const action = event.target.dataset.action;
    const id = event.target.closest('.mock-item')?.dataset.id;
    if (!id || !action) return;
    if (action === 'reset') {
      const { [id]: _removed, ...rest } = settings.mockOverrides;
      update({ mockOverrides: rest });
    }
    if (action === 'remove') {
      const exam = settings.customExams.find((e) => e.id === id);
      if (!exam || !confirm(`'${exam.name}'을(를) 지울까요?`)) return;
      update({ customExams: settings.customExams.filter((e) => e.id !== id) });
    }
    renderMocks();
  });

  // 시험 추가: '+ 추가'를 누르면 입력칸이 열린다
  const setFormOpen = (open) => {
    $('mock-form').hidden = !open;
    $('mock-add-toggle').setAttribute('aria-expanded', String(open));
    $('mock-add-toggle').textContent = open ? '닫기' : '+ 추가';
    $('mock-error').textContent = '';
    if (open) $('mock-name').focus();
  };
  $('mock-add-toggle').addEventListener('click', () => setFormOpen($('mock-form').hidden));

  $('mock-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = $('mock-name').value.trim();
    const date = $('mock-date').value;
    if (!name) return ($('mock-error').textContent = '시험 이름을 입력해 주세요.');
    if (!isDateText(date)) return ($('mock-error').textContent = '날짜를 골라 주세요.');
    $('mock-error').textContent = '';
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    update({ customExams: [...settings.customExams, { id, name: name.slice(0, 30), date }] });
    $('mock-form').reset();
    setFormOpen(false);
    renderMocks();
    $('mock-list').querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest' });
  });

  $('logout-btn').addEventListener('click', onLogout);
}

// 화면에 보여줄 날짜 (예: 6월 2일 (수))
export const shortKoreanDate = (text) => formatKoreanDate(parseDate(text)).replace(/^\d+년 /, '');
