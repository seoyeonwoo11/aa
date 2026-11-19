// 화면 모드: 자동(기기 설정을 따름) / 밝게 / 어둡게
// 기기마다 따로 쓰는 취향이라 서버가 아니라 이 브라우저에만 저장한다.
// (첫 화면이 깜빡이지 않도록 index.html의 <head>에서도 같은 값을 미리 적용한다)

import { readJSON, writeJSON } from '../storage/localStore.js';

const KEY = 'haruSuneung:theme';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

export function getThemePref() {
  const pref = readJSON(KEY, 'system');
  return pref === 'light' || pref === 'dark' ? pref : 'system';
}

export function isDark() {
  const pref = getThemePref();
  return pref === 'dark' || (pref === 'system' && darkQuery.matches);
}

function applyTheme(pref) {
  const root = document.documentElement;
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;
  // 휴대폰 상단 상태 표시줄 색
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || (isDark() ? '#0e1117' : '#f4f6fb'));
}

export function setThemePref(pref) {
  writeJSON(KEY, pref);
  applyTheme(pref);
}

export function initTheme() {
  applyTheme(getThemePref());
  darkQuery.addEventListener('change', () => applyTheme(getThemePref()));
}
