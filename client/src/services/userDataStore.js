// 사용자별 데이터 저장소: Supabase의 user_data 테이블 + 브라우저 캐시
//
// 저장하면 먼저 브라우저에 바로 기록하고(앱이 닫혀도 남도록), 잠시 뒤 서버로 올린다.
// 불러올 때는 서버 값을 쓰되, 서버에 못 올린 더 최신 사본이 있으면 그걸 쓴다. (syncRules.js)
// 인터넷이 끊겨 있으면 브라우저 사본으로 동작하고, 다음 저장이나 연결 복구 때 다시 올린다.

import { supabase } from './supabaseClient.js';
import { readJSON, writeJSON, removeKey } from '../storage/localStore.js';
import { pickNewer } from '../storage/syncRules.js';
import { takeLegacyData } from './legacyImport.js';

const SYNC_DELAY = 800;
const TABLE = 'user_data';
const cacheKey = (kind, userId) => `haruSuneung:cache:${kind}:${userId}`;
const timers = new Map(); // cacheKey → { timer, kind, userId }

async function fetchRemote(kind, userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('data, updated_at')
    .eq('user_id', userId)
    .eq('kind', kind)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function push(kind, userId) {
  const key = cacheKey(kind, userId);
  const local = readJSON(key, null);
  if (!local || local.synced) return;
  const { error } = await supabase.from(TABLE).upsert({
    user_id: userId,
    kind,
    data: local.data,
    updated_at: new Date(local.savedAt).toISOString()
  });
  if (error) throw error;
  // 올리는 동안 새로 저장된 게 없을 때만 '올림 완료'로 표시
  const now = readJSON(key, null);
  if (now && now.savedAt === local.savedAt) writeJSON(key, { ...now, synced: true });
}

function schedule(kind, userId, delay = SYNC_DELAY) {
  const key = cacheKey(kind, userId);
  clearTimeout(timers.get(key)?.timer);
  const timer = setTimeout(() => {
    timers.delete(key);
    push(kind, userId).catch(() => {}); // 실패하면 다음 저장·연결 복구 때 다시 올린다
  }, delay);
  timers.set(key, { timer, kind, userId });
}

export async function loadUserData(kind, userId, fallback) {
  const key = cacheKey(kind, userId);
  const local = readJSON(key, null);

  let remote;
  try {
    remote = await fetchRemote(kind, userId);
  } catch {
    return local ? local.data : fallback; // 오프라인: 이 기기 사본으로
  }

  let { data, push: needsPush } = pickNewer(local, remote);
  if (data === null) {
    // 처음 로그인: 예전(브라우저 전용 계정) 데이터가 있으면 한 번 가져온다
    data = takeLegacyData(kind, userId);
    if (data === null) return fallback;
    needsPush = true;
  }
  writeJSON(key, { data, savedAt: Date.now(), synced: !needsPush });
  if (needsPush) schedule(kind, userId, 0);
  return data;
}

export async function saveUserData(kind, userId, value) {
  writeJSON(cacheKey(kind, userId), { data: value, savedAt: Date.now(), synced: false });
  schedule(kind, userId);
}

// 기다리는 저장을 지금 바로 올린다. (로그아웃 직전, 앱을 나갈 때, 인터넷 연결이 돌아왔을 때)
export async function flushUserData() {
  const jobs = [...timers.values()];
  timers.forEach(({ timer }) => clearTimeout(timer));
  timers.clear();
  await Promise.allSettled(jobs.map(({ kind, userId }) => push(kind, userId)));
}

// 아직 못 올린 사본이 있으면 다시 시도한다.
export function retryUnsynced(userId) {
  for (const kind of ['settings', 'study', 'plans']) {
    const local = readJSON(cacheKey(kind, userId), null);
    if (local && !local.synced) schedule(kind, userId, 0);
  }
}

// 로그아웃 후 이 기기에 남은 사본을 지운다. (공용 기기 대비)
// 서버에 아직 못 올린 사본은 지우지 않고 남겨 두었다가, 다음에 로그인하면 올린다.
export function clearUserCache(userId) {
  for (const kind of ['settings', 'study', 'plans']) {
    const key = cacheKey(kind, userId);
    if (readJSON(key, null)?.synced !== false) removeKey(key);
  }
}
