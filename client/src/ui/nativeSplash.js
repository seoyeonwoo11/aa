// 안드로이드 앱(APK)의 시작 화면(로고)은 웹앱이 첫 화면을 다 그린 뒤에 닫는다.
// (앱은 시작 화면을 스스로 닫지 않게 해 두었다. 웹에서는 아무 일도 하지 않는다)

let hidden = false;

export function hideNativeSplash() {
  if (hidden) return;
  const cap = window.Capacitor;
  if (!cap?.isNativePlatform?.()) return;
  hidden = true;
  cap.nativePromise('SplashScreen', 'hide', { fadeOutDuration: 250 }).catch(() => {});
}

// 혹시 첫 화면이 늦거나 오류가 나도 시작 화면에 갇히지 않게 8초 뒤에는 닫는다
setTimeout(hideNativeSplash, 8000);
