// 처음 로그인한 계정: 준비하는 시험(수능 학년도 / 모의고사 / 직접 정한 시험)을 고르고 시작한다.
// 고른 값은 설정의 목표 시험과 같아서, 나중에 설정 탭에서 바꿀 수 있다.

import { $ } from './dom.js';
import { startOfDay, formatKoreanDate, toDateText } from '../utils/date.js';
import { getExam, getSelectableYears } from '../exam/examDates.js';
import { getMockExams, isDateText } from '../exam/mockExams.js';
import { getTarget } from '../exam/target.js';
import { formatDday, getSummary } from '../exam/dday.js';
import { shortKoreanDate } from './settingsView.js';

let draft = null;
let finish = null;

function option(value, text) {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = text;
  return o;
}

// 지금 고른 값으로 만든 설정
function chosen() {
  const kind = draft.targetKind;
  const next = { ...draft, academicYear: Number($('setup-year').value) };
  if (kind === 'mock') next.targetMockId = $('setup-mock').value;
  if (kind === 'custom') {
    next.customName = $('setup-name').value.trim().slice(0, 30);
    next.customDate = $('setup-date').value;
  }
  return next;
}

function renderMocks() {
  const select = $('setup-mock');
  const keep = select.value;
  const today = toDateText(new Date());
  const mocks = getMockExams({ ...draft, academicYear: Number($('setup-year').value) });
  select.replaceChildren(...mocks.map((m) => option(m.id, `${m.name}, ${shortKoreanDate(m.date)}${m.status === 'estimated' ? ' 예상' : ''}`)));
  // 같은 시험(학년도만 다름)이 있으면 유지하고, 아니면 다가오는 첫 시험
  const sameKind = mocks.find((m) => keep && m.id.slice(5) === keep.slice(5));
  select.value = (sameKind || mocks.find((m) => m.date >= today) || mocks[0])?.id || '';
}

function render() {
  const kind = draft.targetKind;
  document.querySelectorAll('#setup-kinds .setup-kind').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.kind === kind)));
  $('setup-year-field').hidden = kind === 'custom';
  $('setup-mock-field').hidden = kind !== 'mock';
  $('setup-custom').hidden = kind !== 'custom';
  $('setup-error').textContent = '';

  const next = chosen();
  const ready = kind !== 'custom' || isDateText(next.customDate);
  if (!ready) {
    $('setup-preview').textContent = '';
    return;
  }
  const target = getTarget(next);
  $('setup-preview').textContent = `${target.label} ${formatDday(getSummary(new Date(), target.date).diff)}, ${formatKoreanDate(target.date)}`;
}

export function initSetupView() {
  const years = getSelectableYears(startOfDay(new Date()));
  $('setup-year').replaceChildren(...years.map((y) => {
    const exam = getExam(y);
    return option(y, `${y}학년도, ${formatKoreanDate(exam.date)}${exam.official ? '' : ' 예상'}`);
  }));
  document.querySelectorAll('#setup-kinds .setup-kind').forEach((btn) => {
    btn.addEventListener('click', () => {
      draft.targetKind = btn.dataset.kind;
      if (draft.targetKind === 'mock') renderMocks();
      render();
      if (draft.targetKind === 'custom') $('setup-name').focus();
    });
  });
  $('setup-year').addEventListener('change', () => { renderMocks(); render(); });
  for (const id of ['setup-mock', 'setup-date']) $(id).addEventListener('change', render);
  $('setup-name').addEventListener('input', render);

  $('setup-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const next = chosen();
    if (next.targetKind === 'custom' && !isDateText(next.customDate)) {
      $('setup-error').textContent = '시험 날짜를 골라 주세요.';
      $('setup-date').focus();
      return;
    }
    if (next.targetKind === 'mock' && !next.targetMockId) {
      $('setup-error').textContent = '시험을 골라 주세요.';
      return;
    }
    $('setup-screen').hidden = true;
    const done = finish;
    finish = null;
    done?.(next);
  });
}

// 시험 고르기 화면을 띄우고, '시작하기'를 누르면 고른 설정을 돌려준다.
export function runSetup(settings) {
  draft = { ...settings, targetKind: settings.targetKind || 'suneung' };
  $('setup-form').reset();
  $('setup-year').value = String(settings.academicYear);
  $('setup-name').value = settings.customName || '';
  $('setup-date').value = settings.customDate || '';
  renderMocks();
  render();
  $('setup-screen').hidden = false;
  document.querySelector('#setup-kinds [aria-checked="true"]')?.focus();
  return new Promise((resolve) => { finish = resolve; });
}

// 로그아웃 등으로 화면을 닫을 때 (기다리던 쪽은 그대로 버린다)
export function hideSetup() {
  finish = null;
  $('setup-screen').hidden = true;
}

