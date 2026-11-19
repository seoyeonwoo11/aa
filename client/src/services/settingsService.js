// 사용자 설정 (Supabase user_data 'settings')

import { loadUserData, saveUserData } from './userDataStore.js';

export async function loadSettings(userId) {
  return loadUserData('settings', userId, {});
}

export async function saveSettings(userId, settings) {
  await saveUserData('settings', userId, settings);
}
