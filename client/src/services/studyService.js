// 공부 기록 (Supabase user_data 'study')

import { loadUserData, saveUserData } from './userDataStore.js';

export async function loadStudy(userId) {
  const data = (await loadUserData('study', userId, {})) || {};
  return { sessions: Array.isArray(data.sessions) ? data.sessions : [], running: data.running ?? null };
}

export async function saveStudy(userId, data) {
  await saveUserData('study', userId, data);
}
