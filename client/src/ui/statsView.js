// 통계 탭: 주간/월간 요약, 날짜별 공부 시간 막대, 과목별 비율

import { $ } from './dom.js';
import { parseDate, toDateText } from '../utils/date.js';
import { formatDuration } from '../study/studyLog.js';
import { summarize, shiftPeriod } from '../stats/stats.js';

// 과목 색: 과목마다 고정 (순서를 바꾸거나 빠진 과목이 있어도 색이 바뀌지 않게)
// 색약 검사(인접 색 구분)를 통과한 순서. 노랑 위 글자만 검정.
export const SUBJECT_COLORS = {
  국어: '#2a78d6',
  수학: '#eb6834',
  영어: '#1baf7a',
  탐구: '#eda100',
  한국사: '#e87ba4',
  기타: '#008300'
};
const DARK_TEXT_ON = new Set(['#eda100']);
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

let kind = 'week';
let anchor = toDateText(new Date());
let source = null; // { sessions, plans, goalMinutes }

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const hours = (seconds) => seconds / 3600;

// 눈금 간격(시간): 최대값에 따라 1·2·3·4시간
function niceStep(maxHours) {
  if (maxHours <= 4) return 1;
  if (maxHours <= 8) return 2;
  if (maxHours <= 12) return 3;
  return 4;
}

function renderTiles(r) {
  $('stats-period').textContent = r.range.label;
  $('st-total').textContent = formatDuration(r.total);
  $('st-average').textContent = formatDuration(r.average);
  $('st-goal').textContent = `${r.goalDays}/${r.countedDays}일`;
  $('st-streak').textContent = `${r.streak}일`;
  const pct = r.todo.total ? Math.round((r.todo.done / r.todo.total) * 100) : 0;
  $('st-todo').textContent = r.todo.total ? `${r.todo.done}/${r.todo.total} · ${pct}%` : '할 일 없음';
  $('st-todo-fill').style.width = `${pct}%`;
  document.querySelectorAll('.segmented [data-kind]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === kind)));
  // 아직 오지 않은 기간으로는 넘어가지 않는다
  $('stats-next').disabled = r.range.end >= toDateText(new Date());
}

function renderChart(r, goalMinutes) {
  const goalH = goalMinutes / 60;
  const maxH = Math.max(goalH, ...r.days.map((d) => hours(d.seconds)), 1);
  const step = niceStep(maxH);
  const top = Math.ceil(maxH / step) * step;
  const pct = (h) => `${(h / top) * 100}%`;

  // 눈금선과 목표선
  const grid = $('st-grid');
  grid.replaceChildren();
  for (let h = step; h <= top; h += step) {
    const line = el('div', 'grid-line');
    line.style.bottom = pct(h);
    line.append(el('span', 'grid-label', `${h}h`));
    grid.append(line);
  }
  if (goalH) {
    const goal = el('div', 'goal-line');
    goal.style.bottom = pct(goalH);
    grid.append(goal);
  }
  $('st-goal-key').textContent = goalH ? `목표 ${goalH}시간` : '';

  // 막대: 칸 전체가 눌리는 영역, 막대는 바닥에서 자란다
  const bars = $('st-bars');
  bars.replaceChildren();
  bars.style.setProperty('--count', r.days.length);
  const today = toDateText(new Date());
  r.days.forEach((d) => {
    const date = parseDate(d.date);
    const label = `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
    const col = el('button', `bar-col${d.future ? ' future' : ''}${d.date === today ? ' today' : ''}`);
    col.type = 'button';
    col.setAttribute('role', 'listitem');
    col.dataset.value = d.future ? '' : formatDuration(d.seconds);
    col.dataset.label = label;
    col.setAttribute('aria-label', d.future ? `${label}, 아직 오지 않은 날` : `${label}, ${formatDuration(d.seconds)}`);
    if (d.seconds > 0) {
      const bar = el('span', 'bar');
      bar.style.height = pct(hours(d.seconds));
      col.append(bar);
    }
    bars.append(col);
  });

  // 가로축 이름: 주간은 요일, 월간은 1·5·10·15·20·25·말일
  const xl = $('st-xlabels');
  xl.replaceChildren();
  xl.style.setProperty('--count', r.days.length);
  r.days.forEach((d, i) => {
    const date = parseDate(d.date);
    const day = date.getDate();
    let text = '';
    if (kind === 'week') text = WEEKDAYS[date.getDay()];
    else if (day === 1 || day % 5 === 0 && day <= 25 || i === r.days.length - 1) text = String(day);
    xl.append(el('span', d.date === today ? 'today' : '', text));
  });
  hideTooltip();
}

function renderSubjects(r) {
  const bar = $('st-segbar');
  const legend = $('st-legend');
  bar.replaceChildren();
  legend.replaceChildren();
  const empty = r.subjects.length === 0;
  $('st-subject-empty').hidden = !empty;
  bar.hidden = empty;
  legend.hidden = empty;
  if (empty) return;

  bar.setAttribute('aria-label', r.subjects.map((s) => `${s.subject} ${Math.round(s.share * 100)}%`).join(', '));
  for (const s of r.subjects) {
    const color = SUBJECT_COLORS[s.subject] || '#898781';
    const part = el('div', 'seg');
    part.style.flexGrow = String(s.share);
    part.style.background = color;
    part.style.color = DARK_TEXT_ON.has(color) ? '#0b0b0b' : '#ffffff';
    part.dataset.share = `${Math.round(s.share * 100)}%`;
    bar.append(part);

    const li = el('li');
    const sw = el('span', 'swatch');
    sw.style.background = color;
    li.append(sw, el('span', 'seg-name', s.subject), el('span', 'seg-value', formatDuration(s.seconds)));
    legend.append(li);
  }

  // 비율 글자는 칸에 여유 있게 들어갈 때만 칸 안에, 아니면 범례에 붙인다
  requestAnimationFrame(() => {
    [...bar.children].forEach((part, i) => {
      const probe = el('span', 'seg-label', part.dataset.share);
      part.append(probe);
      if (probe.offsetWidth + 12 > part.clientWidth) {
        probe.remove();
        legend.children[i].querySelector('.seg-value').textContent += ` · ${part.dataset.share}`;
      }
    });
  });
}

function render() {
  if (!source) return;
  const r = summarize({ ...source, kind, anchor, today: toDateText(new Date()) });
  renderTiles(r);
  renderChart(r, source.goalMinutes);
  renderSubjects(r);
}

/* ---------- 막대 툴팁 (마우스 올리기·누르기·키보드) ---------- */

function showTooltip(col) {
  if (!col.dataset.value) return hideTooltip();
  const tip = $('st-tooltip');
  tip.replaceChildren(el('strong', '', col.dataset.value), el('span', '', col.dataset.label));
  tip.hidden = false;
  const chart = col.closest('.bar-chart').getBoundingClientRect();
  const box = col.getBoundingClientRect();
  const center = box.left + box.width / 2 - chart.left;
  const half = tip.offsetWidth / 2;
  tip.style.left = `${Math.min(Math.max(center, half), chart.width - half)}px`;
  document.querySelectorAll('.bar-col.active').forEach((c) => c.classList.remove('active'));
  col.classList.add('active');
}

function hideTooltip() {
  $('st-tooltip').hidden = true;
  document.querySelectorAll('.bar-col.active').forEach((c) => c.classList.remove('active'));
}

export function initStatsView() {
  document.querySelectorAll('.segmented [data-kind]').forEach((btn) => {
    btn.addEventListener('click', () => {
      kind = btn.dataset.kind;
      anchor = toDateText(new Date());
      render();
    });
  });
  $('stats-prev').addEventListener('click', () => { anchor = shiftPeriod(kind, anchor, -1); render(); });
  $('stats-next').addEventListener('click', () => { anchor = shiftPeriod(kind, anchor, 1); render(); });

  const bars = $('st-bars');
  bars.addEventListener('pointerover', (e) => { const c = e.target.closest('.bar-col'); if (c) showTooltip(c); });
  bars.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hideTooltip(); });
  bars.addEventListener('click', (e) => { const c = e.target.closest('.bar-col'); if (c) showTooltip(c); });
  bars.addEventListener('focusin', (e) => { const c = e.target.closest('.bar-col'); if (c) showTooltip(c); });
  bars.addEventListener('focusout', hideTooltip);
  window.addEventListener('resize', () => source && renderSubjects(summarize({ ...source, kind, anchor, today: toDateText(new Date()) })));
}

// 탭을 열 때마다 최신 기록으로 다시 그린다.
export function showStats(nextSource) {
  source = nextSource;
  render();
}

export function clearStats() {
  source = null;
  kind = 'week';
  anchor = toDateText(new Date());
}
