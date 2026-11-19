// 앱 진입점: 화면을 연결하고 로그인 상태에 따라 보여줄 화면을 정한다.

import './styles/main.css';
import { $ } from './ui/dom.js';
import { getCurrentUser, logOut } from './services/authService.js';
import { loadSettings, saveSettings } from './services/settingsService.js';
import { initAuthView, showAuthView, hideAuthView } from './ui/authView.js';
import { initDdayView, showDdayView, hideDdayView } from './ui/ddayView.js';

let currentUser = null;

async function enterApp(user) {
  currentUser = user;
  hideAuthView();
  $('user-name').textContent = user.id;
  $('user-bar').hidden = false;
  showDdayView(await loadSettings(user.id));
}

async function leaveApp() {
  await logOut();
  currentUser = null;
  hideDdayView();
  $('user-bar').hidden = true;
  showAuthView();
}

initAuthView({ onSuccess: enterApp });
initDdayView({ onSettingsChange: (settings) => currentUser && saveSettings(currentUser.id, settings) });
$('logout-btn').addEventListener('click', leaveApp);

getCurrentUser().then((user) => (user ? enterApp(user) : showAuthView()));
