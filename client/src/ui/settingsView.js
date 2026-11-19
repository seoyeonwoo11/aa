// 설정 탭: 목표 시험, 하루 공부 목표, 계정

import { $ } from './dom.js';
import { startOfDay, formatKoreanDate } from '../utils/date.js';
import { getExam, getSelectableYears } from '../exam/examDates.js';
import { GOAL_OPTIONS } from '../settings/settings.js';

let settings = null;

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

export function showSettings(next, user) {
  settings = next;
  $('user-name').textContent = user.email;
  renderOptions();
}

export function initSettingsView({ onChange, onLogout }) {
  const goal = $('goal-select');
  for (const minutes of GOAL_OPTIONS) {
    const option = document.createElement('option');
    option.value = minutes;
    option.textContent = `${minutes / 60}시간`;
    goal.appendChild(option);
  }

  const update = (patch) => {
    settings = { ...settings, ...patch };
    onChange(settings);
  };

  $('exam-select').addEventListener('change', (event) => {
    $('custom-date').value = '';
    update({ academicYear: Number(event.target.value), customDate: '' });
  });
  $('custom-date').addEventListener('change', (event) => update({ customDate: event.target.value }));
  $('clear-custom').addEventListener('click', () => {
    $('custom-date').value = '';
    update({ customDate: '' });
  });
  goal.addEventListener('change', (event) => update({ dailyGoalMinutes: Number(event.target.value) }));
  $('logout-btn').addEventListener('click', onLogout);
}
