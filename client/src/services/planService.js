// 계획 저장 (현재: localStorage, 나중에 '/api/plans'로 교체)

import { loadUserData, saveUserData } from './userDataStore.js';
import { normalizePlans } from '../plan/planList.js';

export async function loadPlans(userId) {
  return normalizePlans(loadUserData('plans', userId, null));
}

export async function savePlans(userId, plans) {
  saveUserData('plans', userId, plans);
}
