// 예전 버전(브라우저 전용 계정)의 데이터를 Supabase 계정으로 한 번 옮긴다.
// 이 브라우저에서 처음 로그인한 Supabase 계정만 가져가고, 다른 계정에는 다시 넘기지 않는다.

import { readJSON, writeJSON } from '../storage/localStore.js';

const IMPORTED_BY_KEY = 'haruSuneung:legacyImportedBy';

function legacyUserId() {
  const users = readJSON('suneungDdayUsers', {});
  const session = readJSON('suneungDdaySession', null);
  if (session && users[session]) return session;
  const ids = Object.keys(users);
  return ids.length === 1 ? ids[0] : null; // 예전 계정이 여러 개면 어느 것인지 알 수 없으니 건너뛴다
}

function readLegacy(kind, id) {
  if (kind === 'settings') {
    const settings = readJSON('suneungDdayUsers', {})[id]?.settings;
    return settings && Object.keys(settings).length ? settings : null;
  }
  const data = readJSON(`suneungDday:${kind}:${id}`, null);
  return data && typeof data === 'object' ? data : null;
}

export function takeLegacyData(kind, userId) {
  const importedBy = readJSON(IMPORTED_BY_KEY, null);
  if (importedBy && importedBy !== userId) return null;
  const id = legacyUserId();
  if (!id) return null;
  const data = readLegacy(kind, id);
  if (data !== null) writeJSON(IMPORTED_BY_KEY, userId);
  return data;
}
