// 로그인 (Supabase Auth, 이메일 + 비밀번호)

import { supabase } from './supabaseClient.js';

export const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toUser = (user) => (user ? { id: user.id, email: user.email } : null);

// Supabase 오류를 한국어 안내로 바꾼다.
export function toKoreanError(error) {
  const code = error?.code || '';
  const message = error?.message || '';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) {
    return new Error('메일함에서 가입 확인 링크를 먼저 눌러 주세요.');
  }
  if (code === 'user_already_exists' || /already registered/i.test(message)) {
    return new Error('이미 가입된 이메일입니다.');
  }
  if (code === 'weak_password' || /password should be/i.test(message)) {
    return new Error(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상, 너무 쉽지 않게 정해 주세요.`);
  }
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || /rate limit/i.test(message)) {
    return new Error('요청이 너무 많아요. 잠시 후 다시 시도해 주세요.');
  }
  if (code === 'email_address_invalid' || /invalid.*email|email.*invalid/i.test(message)) {
    return new Error('사용할 수 없는 이메일 주소입니다.');
  }
  if (error instanceof TypeError || /fetch|network/i.test(message)) {
    return new Error('인터넷 연결을 확인해 주세요.');
  }
  return new Error('문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
}

export function validateCredentials(email, password) {
  if (!EMAIL_PATTERN.test(email)) throw new Error('이메일 주소를 정확히 입력해 주세요.');
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상 입력해 주세요.`);
}

// 반환: { user, needsConfirmation }
// Supabase에서 '이메일 확인'이 켜져 있으면 user 없이 needsConfirmation: true
export async function signUp(email, password) {
  validateCredentials(email, password);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${location.origin}${location.pathname}` }
  });
  if (error) throw toKoreanError(error);
  // 이메일 확인이 켜져 있을 때 이미 가입된 주소면 identities가 빈 배열로 온다.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('이미 가입된 이메일입니다.');
  }
  return { user: toUser(data.session?.user), needsConfirmation: !data.session };
}

export async function logIn(email, password) {
  validateCredentials(email, password);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw toKoreanError(error);
  return toUser(data.user);
}

export async function logOut() {
  try {
    await supabase.auth.signOut();
  } catch {
    await supabase.auth.signOut({ scope: 'local' }); // 오프라인이어도 이 기기에서는 로그아웃
  }
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return toUser(data.session?.user);
}

// 로그인 상태 변화 알림: callback(event, user)
export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange((event, session) => callback(event, toUser(session?.user)));
}
