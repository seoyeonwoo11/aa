import { describe, it, expect } from 'vitest';
import { pickNewer } from '../src/storage/syncRules.js';

const T = Date.parse('2026-11-19T10:00:00Z');

describe('pickNewer', () => {
  it('uses the local copy and pushes it when the server has nothing', () => {
    expect(pickNewer(null, null)).toEqual({ data: null, push: false });
    expect(pickNewer({ data: 1, savedAt: T, synced: true }, null)).toEqual({ data: 1, push: true });
  });

  it('prefers a newer unsynced local copy', () => {
    const remote = { data: 'server', updated_at: '2026-11-19T10:00:00Z' };
    expect(pickNewer({ data: 'local', savedAt: T + 5000, synced: false }, remote)).toEqual({ data: 'local', push: true });
  });

  it('otherwise uses the server value', () => {
    const remote = { data: 'server', updated_at: '2026-11-19T10:00:00Z' };
    expect(pickNewer({ data: 'old', savedAt: T - 5000, synced: false }, remote)).toEqual({ data: 'server', push: false });
    expect(pickNewer({ data: 'synced', savedAt: T + 5000, synced: true }, remote)).toEqual({ data: 'server', push: false });
  });
});
