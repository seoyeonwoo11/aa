// 사용자별 데이터 저장소 (현재: localStorage). 서버를 만들면 각 서비스가 API를 호출하도록 바꾼다.

import { readJSON, writeJSON } from '../storage/localStore.js';

const keyFor = (kind, userId) => `suneungDday:${kind}:${userId}`;

export const loadUserData = (kind, userId, fallback) => readJSON(keyFor(kind, userId), fallback);
export const saveUserData = (kind, userId, value) => writeJSON(keyFor(kind, userId), value);
