import type { AxisState, TransformResponse } from "./types.ts";

const STORAGE_KEY = "malbonsae_cache";
const DEFAULT_MAX_SIZE = 200;

interface CacheEntry {
  key: string;
  value: TransformResponse;
  timestamp: number;
}

export class TransformCache {
  private maxSize: number;

  constructor(maxSize: number = DEFAULT_MAX_SIZE) {
    this.maxSize = maxSize;
  }

  private async hashText(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private makeKey(originalTextHash: string, state: AxisState): string {
    const sortedState = Object.keys(state)
      .sort()
      .reduce<Record<string, number>>((acc, k) => {
        acc[k] = state[k as keyof AxisState];
        return acc;
      }, {});
    return `${originalTextHash}::${JSON.stringify(sortedState)}`;
  }

  private loadEntries(): CacheEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveEntries(entries: CacheEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      const half = Math.ceil(entries.length / 2);
      const trimmed = entries.slice(half);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  async get(
    originalText: string,
    state: AxisState,
  ): Promise<TransformResponse | null> {
    const hash = await this.hashText(originalText);
    const key = this.makeKey(hash, state);
    const entries = this.loadEntries();
    const index = entries.findIndex((e) => e.key === key);
    if (index === -1) return null;
    entries[index].timestamp = Date.now();
    this.saveEntries(entries);
    return entries[index].value;
  }

  async set(
    originalText: string,
    state: AxisState,
    response: TransformResponse,
  ): Promise<void> {
    const hash = await this.hashText(originalText);
    const key = this.makeKey(hash, state);
    let entries = this.loadEntries();

    entries = entries.filter((e) => e.key !== key);
    entries.push({ key, value: response, timestamp: Date.now() });

    if (entries.length > this.maxSize) {
      entries.sort((a, b) => a.timestamp - b.timestamp);
      entries = entries.slice(entries.length - this.maxSize);
    }

    this.saveEntries(entries);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
