// 로그인 / 회원가입 화면 (이메일 + 비밀번호)

import { $ } from './dom.js';
import { signUp, logIn } from '../services/authService.js';

let mode = 'login';
let busy = false;

function setMessage(text) {
  $('auth-message').textContent = text;
  $('auth-message').hidden = !text;
}

function setMode(next) {
  mode = next;
  const isSignup = mode === 'signup';
  $('tab-login').classList.toggle('active', !isSignup);
  $('tab-signup').classList.toggle('active', isSignup);
  $('tab-login').setAttribute('aria-selected', String(!isSignup));
  $('tab-signup').setAttribute('aria-selected', String(isSignup));
  $('confirm-field').hidden = !isSignup;
  $('auth-password').autocomplete = isSignup ? 'new-password' : 'current-password';
  $('auth-submit').textContent = isSignup ? '가입하고 시작하기' : '로그인';
  $('auth-error').textContent = '';
}

function setBusy(next) {
  busy = next;
  $('auth-submit').disabled = next;
  $('auth-submit').textContent = next ? '잠시만요…' : mode === 'signup' ? '가입하고 시작하기' : '로그인';
}

export function showAuthView(message = '') {
  $('auth-form').reset();
  setMode('login');
  setMessage(message);
  $('auth-screen').hidden = false;
  $('auth-id').focus();
}

export function hideAuthView() {
  $('auth-form').reset();
  $('auth-error').textContent = '';
  setMessage('');
  $('auth-screen').hidden = true;
}

// 로그인/가입에 성공하면 onSuccess(user)를 호출한다.
export function initAuthView({ onSuccess }) {
  $('tab-login').addEventListener('click', () => setMode('login'));
  $('tab-signup').addEventListener('click', () => {
    setMode('signup');
    setMessage('');
  });

  $('auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    const email = $('auth-id').value.trim();
    const password = $('auth-password').value;
    $('auth-error').textContent = '';

    setBusy(true);
    try {
      if (mode === 'signup') {
        if (password !== $('auth-password-confirm').value) throw new Error('비밀번호 확인이 일치하지 않습니다.');
        const { user, needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          // 이메일 확인이 켜져 있으면: 메일의 링크를 누르면 앱으로 돌아와 자동 로그인된다.
          setBusy(false);
          setMode('login');
          $('auth-id').value = email;
          setMessage(`${email}로 가입 확인 메일을 보냈어요. 메일의 링크를 누르면 로그인돼요.`);
          return;
        }
        onSuccess(user);
      } else {
        onSuccess(await logIn(email, password));
      }
    } catch (error) {
      $('auth-error').textContent = error.message;
    } finally {
      if (busy) setBusy(false);
    }
  });
}
