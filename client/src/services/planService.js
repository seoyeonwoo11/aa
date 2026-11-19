// 계획 (Supabase user_data 'plans')

import { loadUserData, saveUserData } from './userDataStore.js';
import { normalizePlans } from '../plan/planList.js';

export async function loadPlans(userId) {
  return normalizePlans(await loadUserData('plans', userId, null));
}

export async function savePlans(userId, plans) {
  await saveUserData('plans', userId, plans);
}
