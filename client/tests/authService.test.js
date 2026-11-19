import { describe, it, expect, beforeEach } from 'vitest';
import { signUp, logIn, logOut, getCurrentUser } from '../src/services/authService.js';
import { loadSettings, saveSettings } from '../src/services/settingsService.js';

// 테스트용 메모리 localStorage
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
});

describe('authService', () => {
  it('signs up, keeps the session, and logs out', async () => {
    await signUp('kim', '1234');
    expect(await getCurrentUser()).toEqual({ id: 'kim' });
    expect(localStorage.getItem('suneungDdayUsers')).not.toContain('1234');
    await logOut();
    expect(await getCurrentUser()).toBeNull();
  });

  it('rejects duplicate ids, bad passwords and invalid input', async () => {
    await signUp('kim', '1234');
    await expect(signUp('kim', '5678')).rejects.toThrow('이미 사용 중');
    await expect(logIn('kim', 'wrong')).rejects.toThrow('올바르지 않습니다');
    await expect(logIn('nobody', '1234')).rejects.toThrow('올바르지 않습니다');
    await expect(signUp('a', '1234')).rejects.toThrow('아이디는');
    await expect(signUp('lee', '12')).rejects.toThrow('비밀번호는');
    expect(await logIn('kim', '1234')).toEqual({ id: 'kim' });
  });

  it('stores settings per user', async () => {
    await signUp('kim', '1234');
    await signUp('lee', 'abcd');
    await saveSettings('kim', { academicYear: 2030, customDate: '' });
    expect(await loadSettings('kim')).toEqual({ academicYear: 2030, customDate: '' });
    expect(await loadSettings('lee')).toEqual({});
  });
});
