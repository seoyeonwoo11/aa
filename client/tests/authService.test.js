import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn()
};
vi.mock('../src/services/supabaseClient.js', () => ({ supabase: { auth } }));
globalThis.location = { origin: 'https://example.github.io', pathname: '/aa/' };

const { signUp, logIn, logOut, getCurrentUser, toKoreanError } = await import('../src/services/authService.js');

const user = { id: 'u1', email: 'kim@example.com', identities: [{ id: 'i1' }] };

beforeEach(() => Object.values(auth).forEach((fn) => fn.mockReset()));

describe('authService', () => {
  it('validates input before calling Supabase', async () => {
    await expect(signUp('not-an-email', '123456')).rejects.toThrow('이메일 주소');
    await expect(logIn('kim@example.com', '123')).rejects.toThrow('6자 이상');
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('signs up and logs in immediately when email confirmation is off', async () => {
    auth.signUp.mockResolvedValue({ data: { user, session: { user } }, error: null });
    await expect(signUp('kim@example.com', 'secret1')).resolves.toEqual({ user: { id: 'u1', email: 'kim@example.com' }, needsConfirmation: false });
    expect(auth.signUp.mock.calls[0][0].options.emailRedirectTo).toBe('https://example.github.io/aa/');
  });

  it('asks for email confirmation when there is no session', async () => {
    auth.signUp.mockResolvedValue({ data: { user, session: null }, error: null });
    await expect(signUp('kim@example.com', 'secret1')).resolves.toEqual({ user: null, needsConfirmation: true });
  });

  it('detects an already registered email', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { ...user, identities: [] }, session: null }, error: null });
    await expect(signUp('kim@example.com', 'secret1')).rejects.toThrow('이미 가입된');
  });

  it('logs in, reads the session and logs out', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user }, error: null });
    await expect(logIn('kim@example.com', 'secret1')).resolves.toEqual({ id: 'u1', email: 'kim@example.com' });
    auth.getSession.mockResolvedValue({ data: { session: { user } } });
    await expect(getCurrentUser()).resolves.toEqual({ id: 'u1', email: 'kim@example.com' });
    auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(getCurrentUser()).resolves.toBeNull();

    auth.signOut.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({});
    await logOut();
    expect(auth.signOut).toHaveBeenLastCalledWith({ scope: 'local' });
  });

  it('translates Supabase errors to Korean', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { code: 'invalid_credentials', message: 'Invalid login credentials' } });
    await expect(logIn('kim@example.com', 'secret1')).rejects.toThrow('올바르지 않습니다');
    expect(toKoreanError({ code: 'email_not_confirmed' }).message).toContain('가입 확인 링크');
    expect(toKoreanError({ code: 'weak_password' }).message).toContain('6자 이상');
    expect(toKoreanError(new TypeError('Failed to fetch')).message).toContain('인터넷');
  });
});

describe('password reset', async () => {
  const { requestPasswordReset, updatePassword } = await import('../src/services/authService.js');
  auth.resetPasswordForEmail = vi.fn();
  auth.updateUser = vi.fn();

  it('sends a reset email that returns to the app', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    await requestPasswordReset('kim@example.com');
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('kim@example.com', { redirectTo: 'https://example.github.io/aa/' });
    await expect(requestPasswordReset('nope')).rejects.toThrow('이메일 주소');
  });

  it('updates the password', async () => {
    auth.updateUser.mockResolvedValue({ data: { user }, error: null });
    await expect(updatePassword('newpass1')).resolves.toEqual({ id: 'u1', email: 'kim@example.com' });
    await expect(updatePassword('123')).rejects.toThrow('6자 이상');
    auth.updateUser.mockResolvedValue({ data: {}, error: { code: 'same_password', message: 'New password should be different' } });
    await expect(updatePassword('newpass1')).rejects.toThrow('예전과 다른');
  });
});
