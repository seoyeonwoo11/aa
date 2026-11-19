import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installMemoryStorage } from './helpers.js';

// user_data 테이블을 흉내 내는 가짜 Supabase
const table = new Map();
let offline = false;
const upserts = [];
function query() {
  const filters = {};
  const q = {
    select: () => q,
    eq: (col, val) => ((filters[col] = val), q),
    maybeSingle: async () => {
      if (offline) throw new TypeError('Failed to fetch');
      return { data: table.get(`${filters.user_id}/${filters.kind}`) ?? null, error: null };
    },
    upsert: async (row) => {
      if (offline) return { error: { message: 'Failed to fetch' } };
      upserts.push(row);
      table.set(`${row.user_id}/${row.kind}`, { data: row.data, updated_at: row.updated_at });
      return { error: null };
    }
  };
  return q;
}
vi.mock('../src/services/supabaseClient.js', () => ({ supabase: { from: () => query() } }));

const store = await import('../src/services/userDataStore.js');

let storage;
beforeEach(() => {
  storage = installMemoryStorage();
  table.clear();
  upserts.length = 0;
  offline = false;
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-19T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('userDataStore', () => {
  it('saves locally right away and syncs to the server shortly after', async () => {
    await store.saveUserData('plans', 'u1', { days: {}, ranges: [] });
    expect(upserts).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(upserts).toHaveLength(1);
    expect(table.get('u1/plans').data).toEqual({ days: {}, ranges: [] });
    expect(JSON.parse(storage.get('haruSuneung:cache:plans:u1')).synced).toBe(true);
  });

  it('debounces quick successive saves into one upload', async () => {
    for (let i = 0; i < 5; i++) await store.saveUserData('settings', 'u1', { n: i });
    await vi.advanceTimersByTimeAsync(1000);
    expect(upserts).toHaveLength(1);
    expect(upserts[0].data).toEqual({ n: 4 });
  });

  it('loads server data written by another device', async () => {
    table.set('u1/settings', { data: { dailyGoalMinutes: 240 }, updated_at: '2026-11-19T09:00:00Z' });
    await expect(store.loadUserData('settings', 'u1', {})).resolves.toEqual({ dailyGoalMinutes: 240 });
  });

  it('keeps working offline and uploads when back online', async () => {
    offline = true;
    await store.saveUserData('study', 'u1', { sessions: [1] });
    await vi.advanceTimersByTimeAsync(1000);
    expect(table.size).toBe(0);
    await expect(store.loadUserData('study', 'u1', {})).resolves.toEqual({ sessions: [1] });

    offline = false;
    store.retryUnsynced('u1');
    await vi.advanceTimersByTimeAsync(10);
    expect(table.get('u1/study').data).toEqual({ sessions: [1] });
  });

  it('prefers a newer unsynced local copy saved while the app was closing', async () => {
    table.set('u1/study', { data: { sessions: ['old'] }, updated_at: '2026-11-19T09:00:00Z' });
    storage.set('haruSuneung:cache:study:u1', JSON.stringify({ data: { sessions: ['new'] }, savedAt: Date.now(), synced: false }));
    await expect(store.loadUserData('study', 'u1', {})).resolves.toEqual({ sessions: ['new'] });
    await vi.advanceTimersByTimeAsync(10);
    expect(table.get('u1/study').data).toEqual({ sessions: ['new'] });
  });

  it('flushes pending saves immediately', async () => {
    await store.saveUserData('plans', 'u1', { days: { a: [] }, ranges: [] });
    await store.flushUserData();
    expect(upserts).toHaveLength(1);
  });

  it('imports old browser-only data once on first login', async () => {
    storage.set('suneungDdayUsers', JSON.stringify({ kim: { settings: { academicYear: 2029 } } }));
    storage.set('suneungDdaySession', JSON.stringify('kim'));
    storage.set('suneungDday:plans:kim', JSON.stringify({ '2026-11-19': [{ id: 'a', text: 'x', done: false }] }));

    await expect(store.loadUserData('settings', 'u1', {})).resolves.toEqual({ academicYear: 2029 });
    await expect(store.loadUserData('plans', 'u1', null)).resolves.toEqual({ '2026-11-19': [{ id: 'a', text: 'x', done: false }] });
    await vi.advanceTimersByTimeAsync(10);
    expect(table.get('u1/settings').data).toEqual({ academicYear: 2029 });
    // 다른 계정에는 다시 넘기지 않는다
    await expect(store.loadUserData('settings', 'u2', {})).resolves.toEqual({});
  });

  it('clears synced caches on logout but keeps unsynced ones', async () => {
    await store.saveUserData('plans', 'u1', { days: {}, ranges: [] });
    await vi.advanceTimersByTimeAsync(1000);
    offline = true;
    await store.saveUserData('study', 'u1', { sessions: [] });
    store.clearUserCache('u1');
    expect(storage.has('haruSuneung:cache:plans:u1')).toBe(false);
    expect(storage.has('haruSuneung:cache:study:u1')).toBe(true);
  });
});
