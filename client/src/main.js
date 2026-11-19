// 앱 진입점: 로그인 상태에 따라 화면을 연결하고, 설정이 바뀌면 각 탭에 알린다.

import './styles/main.css';
import { $ } from './ui/dom.js';
import { getCurrentUser, logOut } from './services/authService.js';
import { loadSettings, saveSettings } from './services/settingsService.js';
import { normalizeSettings } from './settings/settings.js';
import { initAuthView, showAuthView, hideAuthView } from './ui/authView.js';
import { initTabs, showTab, getTabFromHash, setTabsVisible } from './ui/tabs.js';
import { initDdayView, setDdaySettings, clearDdayView } from './ui/ddayView.js';
import { initStudyView, showStudy, setStudySettings, refreshStudy, clearStudy } from './ui/studyView.js';
import { initPlanView, showPlans, setPlanSettings, refreshPlans, clearPlans } from './ui/planView.js';
import { initSettingsView, showSettings } from './ui/settingsView.js';

let currentUser = null;
let settings = null;

async function enterApp(user) {
  currentUser = user;
  settings = normalizeSettings(await loadSettings(user.id));
  hideAuthView();

  setDdaySettings(settings);
  showSettings(settings, user);
  await Promise.all([showStudy(user.id, settings), showPlans(user.id, settings)]);

  $('app-content').hidden = false;
  setTabsVisible(true);
  showTab(getTabFromHash());
}

async function leaveApp() {
  await logOut();
  currentUser = null;
  settings = null;
  clearDdayView();
  clearStudy();
  clearPlans();
  $('app-content').hidden = true;
  setTabsVisible(false);
  history.replaceState(null, '', location.pathname);
  showAuthView();
}

function updateSettings(next) {
  settings = next;
  saveSettings(currentUser.id, settings);
  setDdaySettings(settings);
  setStudySettings(settings);
  setPlanSettings(settings);
}

initAuthView({ onSuccess: enterApp });
initTabs({
  onTabChange: (tab) => {
    if (tab === 'study') refreshStudy();
    if (tab === 'home' || tab === 'plan') refreshPlans();
    if (tab === 'settings') showSettings(settings, currentUser);
  }
});
initDdayView();
initStudyView();
initPlanView();
initSettingsView({ onChange: updateSettings, onLogout: leaveApp });

getCurrentUser().then((user) => (user ? enterApp(user) : showAuthView()));
