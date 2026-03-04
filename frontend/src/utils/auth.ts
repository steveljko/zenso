import { me, type User } from '../http/auth';

type AuthChangeCallback = (user: User | null) => void;

class AuthManager {
  private static readonly CACHE_KEY = 'zento_liu';
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000;

  private user: User | null = null;
  private verifiedAt: number | null = null;
  private listeners: Set<AuthChangeCallback> = new Set();
  private verifyPromise: Promise<User | null> | null = null;

  async init(): Promise<User | null> {
    const cached = this.readCache();
    if (cached) {
      this.set(cached);
      return cached;
    }
    return this.verify();
  }

  verify(): Promise<User | null> {
    if (this.verifyPromise) return this.verifyPromise;

    this.verifyPromise = (async () => {
      try {
        const user = await me();
        this.set(user);
        this.writeCache(user);
        return user;
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          this.clearCache();
          this.set(null);
          return null;
        }
        return this.user;
      } finally {
        this.verifyPromise = null;
      }
    })();

    return this.verifyPromise;
  }

  setFromLogin(user: User): void {
    this.writeCache(user);
    this.set(user);
  }

  clear(): void {
    this.clearCache();
    this.set(null);
  }

  get currentUser(): User | null {
    return this.user;
  }

  get isAuthenticated(): boolean {
    return this.user !== null;
  }

  onChange(cb: AuthChangeCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private set(user: User | null): void {
    this.user = user;
    this.verifiedAt = user ? Date.now() : null;
    this.listeners.forEach((cb) => cb(user));
  }

  private readCache(): User | null {
    try {
      const raw = localStorage.getItem(AuthManager.CACHE_KEY);
      if (!raw) return null;
      const { user, ts } = JSON.parse(raw) as { user: User; ts: number };
      if (Date.now() - ts > AuthManager.CACHE_TTL_MS) return null;
      return user;
    } catch {
      return null;
    }
  }

  private writeCache(user: User): void {
    localStorage.setItem(AuthManager.CACHE_KEY, JSON.stringify({ user, ts: Date.now() }));
  }

  private clearCache(): void {
    localStorage.removeItem(AuthManager.CACHE_KEY);
  }
}

export const auth = new AuthManager();
