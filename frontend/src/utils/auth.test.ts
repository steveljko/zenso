import { describe, test, expect, beforeEach, vi } from 'vitest';
import { auth } from './auth';
import type { User } from '../http/auth';

// mocks
vi.mock('../http/auth', () => ({
  me: vi.fn(),
}));

const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
});

import { me } from '../http/auth';

const mockMe = vi.mocked(me);

const makeUser = (overrides: Partial<User> = {}): User => ({
  name: 'Jane Doe',
  email: 'jane@example.com',
  ...overrides,
});

describe('AuthManager', () => {
  beforeEach(() => {
    localStorage.removeItem('zento_liu');
    auth.clear();
    vi.clearAllMocks();
  });

  describe('init', () => {
    test('returns null when no cache and me() returns 401', async () => {
      mockMe.mockRejectedValueOnce({ response: { status: 401 } });
      const user = await auth.init();
      expect(user).toBeNull();
    });

    test('returns user from cache when cache is fresh', async () => {
      const user = makeUser();
      auth.setFromLogin(user);
      const result = await auth.init();
      expect(result).toEqual(user);
    });

    test('does not call me() when cache is fresh', async () => {
      auth.setFromLogin(makeUser());
      await auth.init();
      expect(mockMe).not.toHaveBeenCalled();
    });

    test('calls me() when cache is expired', async () => {
      const user = makeUser();
      const expiredTs = Date.now() - 6 * 60 * 1000;
      localStorage.setItem('zento_liu', JSON.stringify({ user, ts: expiredTs }));
      mockMe.mockResolvedValueOnce(user);
      await auth.init();
      expect(mockMe).toHaveBeenCalledOnce();
    });

    test('sets user from me() when cache is missing', async () => {
      const user = makeUser();
      mockMe.mockResolvedValueOnce(user);
      const result = await auth.init();
      expect(result).toEqual(user);
    });
  });

  describe('verify', () => {
    test('sets user on success', async () => {
      const user = makeUser();
      mockMe.mockResolvedValueOnce(user);
      await auth.verify();
      expect(auth.currentUser).toEqual(user);
    });

    test('writes cache on success', async () => {
      const user = makeUser();
      mockMe.mockResolvedValueOnce(user);
      await auth.verify();
      const raw = localStorage.getItem('zento_liu');
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).user).toEqual(user);
    });

    test('clears user on 401', async () => {
      auth.setFromLogin(makeUser());
      mockMe.mockRejectedValueOnce({ response: { status: 401 } });
      await auth.verify();
      expect(auth.currentUser).toBeNull();
    });

    test('clears cache on 401', async () => {
      auth.setFromLogin(makeUser());
      mockMe.mockRejectedValueOnce({ response: { status: 401 } });
      await auth.verify();
      expect(localStorage.getItem('zento_liu')).toBeNull();
    });

    test('keeps existing user on network error', async () => {
      const user = makeUser();
      auth.setFromLogin(user);
      mockMe.mockRejectedValueOnce(new Error('Network Error'));
      await auth.verify();
      expect(auth.currentUser).toEqual(user);
    });

    test('de-duplicates concurrent calls — only one me() request', async () => {
      const user = makeUser();
      mockMe.mockResolvedValue(user);
      await Promise.all([auth.verify(), auth.verify(), auth.verify()]);
      expect(mockMe).toHaveBeenCalledOnce();
    });
  });

  describe('setFromLogin', () => {
    test('sets currentUser', () => {
      const user = makeUser();
      auth.setFromLogin(user);
      expect(auth.currentUser).toEqual(user);
    });

    test('writes user to cache', () => {
      const user = makeUser();
      auth.setFromLogin(user);
      const raw = localStorage.getItem('zento_liu');
      expect(JSON.parse(raw!).user).toEqual(user);
    });

    test('sets isAuthenticated to true', () => {
      auth.setFromLogin(makeUser());
      expect(auth.isAuthenticated).toBe(true);
    });

    test('notifies listeners', () => {
      const cb = vi.fn();
      auth.onChange(cb);
      const user = makeUser();
      auth.setFromLogin(user);
      expect(cb).toHaveBeenCalledWith(user);
    });
  });

  describe('clear', () => {
    test('sets currentUser to null', () => {
      auth.setFromLogin(makeUser());
      auth.clear();
      expect(auth.currentUser).toBeNull();
    });

    test('removes cache entry', () => {
      auth.setFromLogin(makeUser());
      auth.clear();
      expect(localStorage.getItem('zento_liu')).toBeNull();
    });

    test('sets isAuthenticated to false', () => {
      auth.setFromLogin(makeUser());
      auth.clear();
      expect(auth.isAuthenticated).toBe(false);
    });

    test('notifies listeners with null', () => {
      const cb = vi.fn();
      auth.setFromLogin(makeUser());
      auth.onChange(cb);
      auth.clear();
      expect(cb).toHaveBeenCalledWith(null);
    });
  });

  describe('isAuthenticated', () => {
    test('is false by default', () => {
      expect(auth.isAuthenticated).toBe(false);
    });

    test('is true after setFromLogin', () => {
      auth.setFromLogin(makeUser());
      expect(auth.isAuthenticated).toBe(true);
    });

    test('is false after clear', () => {
      auth.setFromLogin(makeUser());
      auth.clear();
      expect(auth.isAuthenticated).toBe(false);
    });
  });

  describe('onChange', () => {
    test('fires callback when user is set', () => {
      const cb = vi.fn();
      auth.onChange(cb);
      const user = makeUser();
      auth.setFromLogin(user);
      expect(cb).toHaveBeenCalledWith(user);
    });

    test('fires callback when user is cleared', () => {
      const cb = vi.fn();
      auth.setFromLogin(makeUser());
      auth.onChange(cb);
      auth.clear();
      expect(cb).toHaveBeenCalledWith(null);
    });

    test('unsubscribe stops future callbacks', () => {
      const cb = vi.fn();
      const unsub = auth.onChange(cb);
      unsub();
      auth.setFromLogin(makeUser());
      expect(cb).not.toHaveBeenCalled();
    });

    test('multiple listeners all receive the update', () => {
      const a = vi.fn();
      const b = vi.fn();
      auth.onChange(a);
      auth.onChange(b);
      auth.setFromLogin(makeUser());
      expect(a).toHaveBeenCalledOnce();
      expect(b).toHaveBeenCalledOnce();
    });
  });
});
