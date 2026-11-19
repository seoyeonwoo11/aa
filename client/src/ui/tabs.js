// 하단 탭 바와 탭 전환. 현재 탭은 주소의 #해시에 남겨 새로고침해도 유지된다.

import { $ } from './dom.js';

export const TABS = {
  home: '수능 D-Day',
  study: '공부 모드',
  plan: '계획',
  settings: '설정'
};

let onChange = () => {};

export function getTabFromHash() {
  const tab = location.hash.slice(1);
  return tab in TABS ? tab : 'home';
}

export function showTab(tab) {
  for (const name of Object.keys(TABS)) {
    $(`panel-${name}`).hidden = name !== tab;
  }
  document.querySelectorAll('.nav-item').forEach((btn) => {
    if (btn.dataset.tab === tab) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
  $('page-title').textContent = TABS[tab];
  document.body.dataset.tab = tab; // 탭별 레이아웃(계획 탭은 넓게)
  window.scrollTo(0, 0);
  onChange(tab);
}

export function initTabs({ onTabChange }) {
  onChange = onTabChange;
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (location.hash.slice(1) === btn.dataset.tab) showTab(btn.dataset.tab);
      else location.hash = btn.dataset.tab;
    });
  });
  window.addEventListener('hashchange', () => {
    if (!$('nav-bar').hidden) showTab(getTabFromHash());
  });
}

export function setTabsVisible(visible) {
  $('nav-bar').hidden = !visible;
  document.body.classList.toggle('has-nav', visible);
  if (!visible) {
    $('page-title').textContent = '수능 D-Day 계산기';
    delete document.body.dataset.tab;
  }
}
