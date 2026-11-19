// 로그인 서비스 (현재: 브라우저 localStorage 구현)
//
// 서버를 만들면 이 파일의 함수 내부만 fetch('/api/auth/...') 호출로 바꾸면 된다.
// 함수 이름과 반환 형태(Promise)는 그대로 두어 UI 코드는 고치지 않아도 되게 한다.

import { readJSON, writeJSON, removeKey } from '../storage/localStore.js';

const USERS_KEY = 'suneungDdayUsers';
const SESSION_KEY = 'suneungDdaySession';

export const ID_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
export const MIN_PASSWORD_LENGTH = 4;

export const loadUsers = () => readJSON(USERS_KEY, {});
export const saveUsers = (users) => writeJSON(USERS_KEY, users);

function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt() {
  return toHex(crypto.getRandomValues(new Uint8Array(16)));
}

// 비밀번호는 그대로 저장하지 않고 salt를 붙여 SHA-256 해시로 저장한다.
async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
}

export function validateCredentials(id, password) {
  if (!ID_PATTERN.test(id)) throw new Error('아이디는 영문·숫자·밑줄(_) 3~20자로 입력해 주세요.');
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상 입력해 주세요.`);
}

export async function signUp(id, password) {
  validateCredentials(id, password);
  const users = loadUsers();
  if (users[id]) throw new Error('이미 사용 중인 아이디입니다.');
  const salt = randomSalt();
  users[id] = {
    salt,
    hash: await hashPassword(password, salt),
    createdAt: new Date().toISOString(),
    settings: {}
  };
  if (!saveUsers(users)) throw new Error('이 브라우저에서는 저장할 수 없어요. 시크릿 모드인지 확인해 주세요.');
  writeJSON(SESSION_KEY, id);
  return { id };
}

export async function logIn(id, password) {
  validateCredentials(id, password);
  const user = loadUsers()[id];
  if (!user || (await hashPassword(password, user.salt)) !== user.hash) {
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
  }
  writeJSON(SESSION_KEY, id);
  return { id };
}

export async function logOut() {
  removeKey(SESSION_KEY);
}

// 새로고침 후 로그인 유지: 저장된 세션이 있고 계정이 남아 있으면 사용자 정보를 돌려준다.
export async function getCurrentUser() {
  const id = readJSON(SESSION_KEY, null);
  return id && loadUsers()[id] ? { id } : null;
}
