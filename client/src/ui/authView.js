// 로그인 / 회원가입 화면

import { $ } from './dom.js';
import { signUp, logIn } from '../services/authService.js';

let mode = 'login';

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

export function showAuthView() {
  $('auth-form').reset();
  setMode('login');
  $('auth-screen').hidden = false;
  $('auth-id').focus();
}

export function hideAuthView() {
  $('auth-form').reset();
  $('auth-error').textContent = '';
  $('auth-screen').hidden = true;
}

// 로그인/가입에 성공하면 onSuccess(user)를 호출한다.
export function initAuthView({ onSuccess }) {
  $('tab-login').addEventListener('click', () => setMode('login'));
  $('tab-signup').addEventListener('click', () => setMode('signup'));

  $('auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = $('auth-id').value.trim();
    const password = $('auth-password').value;

    try {
      let user;
      if (mode === 'signup') {
        if (password !== $('auth-password-confirm').value) throw new Error('비밀번호 확인이 일치하지 않습니다.');
        user = await signUp(id, password);
      } else {
        user = await logIn(id, password);
      }
      onSuccess(user);
    } catch (error) {
      $('auth-error').textContent = error.message;
    }
  });
}
