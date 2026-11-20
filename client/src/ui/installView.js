// 홈 화면 설치(PWA): 설정 탭의 '앱으로 설치' 안내와 버튼, 오프라인용 서비스 워커 등록

import { $ } from './dom.js';

let installPrompt = null; // 안드로이드·PC 크롬이 주는 설치 창

const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true ||
  Boolean(window.Capacitor?.isNativePlatform?.()); // 안드로이드 앱(설치 파일)으로 열었을 때

// iPadOS는 맥처럼 보고하므로 터치 지원으로 구분한다.
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function render() {
  const card = $('install-card');
  if (isInstalled()) {
    card.hidden = true; // 이미 설치된 앱으로 열었으면 안내할 필요 없음
    return;
  }
  card.hidden = false;
  $('install-btn').hidden = !installPrompt;
  $('install-hint').textContent = installPrompt
    ? '홈 화면 아이콘으로 바로 열고, 인터넷이 없어도 쓸 수 있어요.'
    : isIOS()
      ? '아래(또는 위) 공유 버튼을 누르고 ‘홈 화면에 추가’를 고르세요.'
      : '브라우저 메뉴(⋮)에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 고르세요.';
}

export function initInstall() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // 브라우저 기본 배너 대신 설정 탭의 버튼으로
    installPrompt = event;
    render();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    render();
  });
  $('install-btn').addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => {});
    installPrompt = null;
    render();
  });
  render();

  // 배포된 앱에서만 서비스 워커를 켠다. (개발 서버에서는 오래된 사본이 헷갈리게 하므로 끔)
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
    });
  }
}
