// 앱 진입점: 로그인 상태에 따라 화면을 연결하고, 설정이 바뀌면 각 탭에 알린다.

import './styles/main.css';
import { initTheme } from './ui/theme.js';
import { initInstall } from './ui/installView.js';
import { $ } from './ui/dom.js';
import { getCurrentUser, logOut, onAuthChange, isRecoveryLink } from './services/authService.js';
import { loadSettings, saveSettings } from './services/settingsService.js';
import { flushUserData, retryUnsynced, clearUserCache } from './services/userDataStore.js';
import { normalizeSettings } from './settings/settings.js';
import { initAuthView, showAuthView, showRecoveryView, hideAuthView } from './ui/authView.js';
import { initTabs, showTab, getTabFromHash, setTabsVisible } from './ui/tabs.js';
import { initDdayView, setDdaySettings, clearDdayView } from './ui/ddayView.js';
import { initStudyView, showStudy, setStudySettings, refreshStudy, clearStudy, getStudySessions } from './ui/studyView.js';
import { initPlanView, showPlans, setPlanSettings, refreshPlans, clearPlans, getPlans } from './ui/planView.js';
import { initStatsView, showStats, clearStats } from './ui/statsView.js';
import { initSettingsView, showSettings } from './ui/settingsView.js';

let currentUser = null;
let settings = null;
let entering = null; // 같은 사용자로 두 번 들어가지 않도록
let recovering = isRecoveryLink(); // 비밀번호 재설정 메일의 링크로 들어왔는지 (Supabase가 주소를 지우기 전에 확인)

function enterApp(user) {
  if (currentUser?.id === user.id) return entering;
  currentUser = user;
  entering = (async () => {
    settings = normalizeSettings(await loadSettings(user.id));
    hideAuthView();

    setDdaySettings(settings);
    showSettings(settings, user);
    await Promise.all([showStudy(user.id, settings), showPlans(user.id, settings)]);

    $('app-content').hidden = false;
    setTabsVisible(true);
    showTab(getTabFromHash());
  })();
  return entering;
}

// 화면만 로그인 전 상태로 되돌린다.
function resetToAuth(message) {
  const userId = currentUser?.id;
  currentUser = null;
  settings = null;
  entering = null;
  clearDdayView();
  clearStudy();
  clearPlans();
  clearStats();
  if (userId) clearUserCache(userId);
  $('app-content').hidden = true;
  setTabsVisible(false);
  history.replaceState(null, '', location.pathname);
  showAuthView(message);
}

async function leaveApp() {
  clearStudy(); // 진행 중인 타이머를 멈추고 저장
  await flushUserData(); // 서버에 못 올린 저장을 마저 올린 뒤
  await logOut();
  resetToAuth();
}

function updateSettings(next) {
  settings = next;
  saveSettings(currentUser.id, settings);
  setDdaySettings(settings);
  setStudySettings(settings);
  setPlanSettings(settings);
}

initTheme();
initInstall();
initAuthView({
  onSuccess: (user) => {
    recovering = false;
    enterApp(user);
  }
});
initTabs({
  onTabChange: (tab) => {
    if (tab === 'study') refreshStudy();
    if (tab === 'home' || tab === 'plan') refreshPlans();
    if (tab === 'settings') showSettings(settings, currentUser);
    if (tab === 'stats') showStats({ sessions: getStudySessions(), plans: getPlans(), goalMinutes: settings.dailyGoalMinutes });
  }
});
initDdayView();
initStudyView();
initPlanView();
initStatsView();
initSettingsView({ onChange: updateSettings, onLogout: leaveApp });

// 가입 확인 링크로 돌아왔을 때, 다른 탭에서 로그아웃했을 때 등
onAuthChange((event, user) => {
  if (event === 'PASSWORD_RECOVERY') {
    recovering = true;
    showRecoveryView();
  } else if (event === 'SIGNED_OUT' && currentUser) resetToAuth();
  else if (user && event === 'SIGNED_IN' && !recovering) enterApp(user);
});

// 앱을 나갈 때 기다리는 저장을 서버로 올리고, 연결이 돌아오면 못 올린 것을 다시 올린다.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushUserData();
});
window.addEventListener('online', () => currentUser && retryUnsynced(currentUser.id));

getCurrentUser()
  .then((user) => {
    if (user && recovering) return showRecoveryView(); // 새 비밀번호부터 정한다
    return user ? enterApp(user) : showAuthView();
  })
  .catch(() => showAuthView('인터넷 연결을 확인해 주세요.'));
