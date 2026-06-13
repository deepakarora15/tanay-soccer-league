import fs from 'fs';
import path from 'path';

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

const CACHE_FILE_PATH = path.resolve(process.cwd(), 'data', 'cache.json');

export class MemoryCache {
  private store: Map<string, CacheEntry<unknown>> = new Map();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.cachedAt > entry.ttlMs) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
      ttlMs,
    };
    this.store.set(key, entry);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  persist(): void {
    const dir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const now = Date.now();
    const entries: Record<string, CacheEntry<unknown>> = {};

    for (const [key, entry] of this.store.entries()) {
      if (now - entry.cachedAt <= entry.ttlMs) {
        entries[key] = entry;
      }
    }

    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(entries, null, 2), 'utf-8');
  }

  restore(): void {
    if (!fs.existsSync(CACHE_FILE_PATH)) {
      return;
    }

    try {
      const raw = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
      const entries: Record<string, CacheEntry<unknown>> = JSON.parse(raw);
      const now = Date.now();

      for (const [key, entry] of Object.entries(entries)) {
        if (now - entry.cachedAt <= entry.ttlMs) {
          this.store.set(key, entry);
        }
      }
    } catch {
      // If the file is corrupted or unreadable, skip restoration
    }
  }
}

export const cache = new MemoryCache();

export const CACHE_KEYS = {
  LIVE_SCORES: 'live-scores',
  SCHEDULE: 'schedule',
  NEWS: 'news',
  EVENTS: 'events',
} as const;

export const CACHE_TTLS = {
  LIVE_SCORES: 2 * 60 * 1000,      // 2 minutes
  SCHEDULE: 30 * 60 * 1000,         // 30 minutes
  NEWS: 2 * 60 * 60 * 1000,         // 2 hours
  EVENTS: 2 * 60 * 1000,            // 2 minutes
} as const;
