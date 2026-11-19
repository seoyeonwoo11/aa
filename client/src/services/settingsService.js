// 사용자별 설정 저장 (현재: localStorage, 나중에 '/api/settings'로 교체)

import { loadUsers, saveUsers } from './authService.js';

export async function loadSettings(userId) {
  return loadUsers()[userId]?.settings ?? {};
}

export async function saveSettings(userId, settings) {
  const users = loadUsers();
  if (!users[userId]) return;
  users[userId].settings = settings;
  saveUsers(users);
}
