// 사용자 설정 (Supabase user_data 'settings')

import { loadUserData, saveUserData } from './userDataStore.js';

// 저장된 설정이 없으면(처음 로그인한 계정) null
export async function loadSettings(userId) {
  return loadUserData('settings', userId, null);
}

export async function saveSettings(userId, settings) {
  await saveUserData('settings', userId, settings);
}
