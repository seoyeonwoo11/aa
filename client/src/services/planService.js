// 날짜별 계획 저장 (현재: localStorage, 나중에 '/api/plans'로 교체)

import { loadUserData, saveUserData } from './userDataStore.js';

export async function loadPlans(userId) {
  const plans = loadUserData('plans', userId, {});
  return plans && typeof plans === 'object' ? plans : {};
}

export async function savePlans(userId, plans) {
  saveUserData('plans', userId, plans);
}
