// localStorage 접근을 한곳에 모은다. 저장이 막힌 환경(시크릿 모드 등)에서도 앱이 멈추지 않게 한다.

export function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // 무시
  }
}
