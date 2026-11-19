// 공부 기록 저장 (현재: localStorage, 나중에 '/api/study'로 교체)

import { loadUserData, saveUserData } from './userDataStore.js';

export async function loadStudy(userId) {
  const data = loadUserData('study', userId, {});
  return { sessions: Array.isArray(data.sessions) ? data.sessions : [], running: data.running ?? null };
}

export async function saveStudy(userId, data) {
  saveUserData('study', userId, data);
}
