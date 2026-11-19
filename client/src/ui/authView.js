// 로그인 화면: 로그인 / 회원가입 / 비밀번호 재설정 메일 / 새 비밀번호

import { $ } from './dom.js';
import { signUp, logIn, requestPasswordReset, updatePassword } from '../services/authService.js';
import { normalizeSettings } from '../settings/settings.js';
import { getTarget } from '../exam/target.js';
import { formatDday, getSummary } from '../exam/dday.js';

// mode: 'login' | 'signup' | 'reset'(재설정 메일 받기) | 'recovery'(메일 링크로 들어와 새 비밀번호 정하기)
let mode = 'login';
let busy = false;
let onSuccess = () => {};

const SUBMIT_LABEL = {
  login: '로그인',
  signup: '가입하고 시작하기',
  reset: '재설정 메일 보내기',
  recovery: '새 비밀번호로 바꾸기'
};

function setMessage(text) {
  $('auth-message').textContent = text;
  $('auth-message').hidden = !text;
}

function setMode(next) {
  mode = next;
  const isTabbed = mode === 'login' || mode === 'signup';
  $('auth-tabs').hidden = !isTabbed;
  $('tab-login').classList.toggle('active', mode === 'login');
  $('tab-signup').classList.toggle('active', mode === 'signup');
  $('tab-login').setAttribute('aria-selected', String(mode === 'login'));
  $('tab-signup').setAttribute('aria-selected', String(mode === 'signup'));

  $('auth-heading').hidden = isTabbed;
  $('auth-help').hidden = isTabbed;
  if (mode === 'reset') {
    $('auth-heading').textContent = '비밀번호 재설정';
    $('auth-help').textContent = '가입한 이메일로 비밀번호를 바꿀 수 있는 링크를 보내 드려요.';
  }
  if (mode === 'recovery') {
    $('auth-heading').textContent = '새 비밀번호 정하기';
    $('auth-help').textContent = '앞으로 로그인할 때 쓸 비밀번호를 입력해 주세요.';
  }

  $('email-field').hidden = mode === 'recovery';
  $('password-field').hidden = mode === 'reset';
  $('password-label').textContent = mode === 'recovery' ? '새 비밀번호' : '비밀번호';
  $('confirm-field').hidden = !(mode === 'signup' || mode === 'recovery');
  $('auth-password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  $('forgot-btn').hidden = mode !== 'login';
  $('back-to-login').hidden = mode !== 'reset';
  $('auth-submit').textContent = SUBMIT_LABEL[mode];
  $('auth-error').textContent = '';
}

function setBusy(next) {
  busy = next;
  $('auth-submit').disabled = next;
  $('auth-submit').textContent = next ? '잠시만요…' : SUBMIT_LABEL[mode];
}

function setPasswordVisible(visible) {
  $('auth-password').type = visible ? 'text' : 'password';
  $('auth-password-confirm').type = visible ? 'text' : 'password';
  $('pw-toggle').setAttribute('aria-pressed', String(visible));
  $('pw-toggle').setAttribute('aria-label', visible ? '비밀번호 숨기기' : '비밀번호 보기');
}

// 로그인 전에도 다가오는 수능 D-Day를 보여준다.
function renderDday() {
  const target = getTarget(normalizeSettings({}));
  $('auth-dday').textContent = `${target.label} ${formatDday(getSummary(new Date(), target.date).diff)}`;
}

function show(nextMode, message = '') {
  $('auth-form').reset();
  setPasswordVisible(false);
  setMode(nextMode);
  setMessage(message);
  renderDday();
  $('auth-screen').hidden = false;
  (nextMode === 'recovery' ? $('auth-password') : $('auth-id')).focus();
}

export function showAuthView(message = '') {
  show('login', message);
}

// 비밀번호 재설정 메일의 링크로 들어왔을 때
export function showRecoveryView() {
  show('recovery');
}

export function hideAuthView() {
  $('auth-form').reset();
  $('auth-error').textContent = '';
  setMessage('');
  $('auth-screen').hidden = true;
}

async function submit() {
  const email = $('auth-id').value.trim();
  const password = $('auth-password').value;
  const confirmValue = $('auth-password-confirm').value;

  if (mode === 'login') return onSuccess(await logIn(email, password));

  if (mode === 'signup') {
    if (password !== confirmValue) throw new Error('비밀번호 확인이 일치하지 않습니다.');
    const { user, needsConfirmation } = await signUp(email, password);
    if (!needsConfirmation) return onSuccess(user);
    // 이메일 확인이 켜져 있으면: 메일의 링크를 누르면 앱으로 돌아와 자동 로그인된다.
    setMode('login');
    $('auth-id').value = email;
    return setMessage(`${email}로 가입 확인 메일을 보냈어요. 메일의 링크를 누르면 로그인돼요.`);
  }

  if (mode === 'reset') {
    await requestPasswordReset(email);
    setMode('login');
    $('auth-id').value = email;
    return setMessage(`${email}로 비밀번호 재설정 메일을 보냈어요. 메일의 링크를 눌러 새 비밀번호를 정해 주세요.`);
  }

  if (mode === 'recovery') {
    if (password !== confirmValue) throw new Error('비밀번호 확인이 일치하지 않습니다.');
    const user = await updatePassword(password);
    return onSuccess(user);
  }
}

export function initAuthView({ onSuccess: handleSuccess }) {
  onSuccess = handleSuccess;
  $('tab-login').addEventListener('click', () => setMode('login'));
  $('tab-signup').addEventListener('click', () => {
    setMode('signup');
    setMessage('');
  });
  $('forgot-btn').addEventListener('click', () => {
    setMode('reset');
    setMessage('');
    $('auth-id').focus();
  });
  $('back-to-login').addEventListener('click', () => {
    setMode('login');
    setMessage('');
  });
  $('pw-toggle').addEventListener('click', () => setPasswordVisible($('auth-password').type === 'password'));

  $('auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    $('auth-error').textContent = '';
    setBusy(true);
    try {
      await submit();
    } catch (error) {
      $('auth-error').textContent = error.message;
    } finally {
      setBusy(false);
    }
  });
}
