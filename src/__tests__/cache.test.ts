import { describe, it, expect, beforeEach, vi } from "vitest";
import { TransformCache } from "@/lib/cache";
import type { AxisState, TransformResponse } from "@/lib/types";

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};

vi.stubGlobal("localStorage", localStorageMock);

describe("TransformCache", () => {
  let cache: TransformCache;

  beforeEach(() => {
    localStorageMock.clear();
    cache = new TransformCache();
  });

  const text = "안녕하세요";
  const state: AxisState = {
    length: 1,
    friendliness: 0,
    euphemism: 0,
    formality: 0,
    punctuation: 0,
  };
  const response: TransformResponse = { text: "안녕하세요~", disabled: [] };

  it("returns null for cache miss", async () => {
    expect(await cache.get(text, state)).toBeNull();
  });

  it("returns cached value for cache hit", async () => {
    await cache.set(text, state, response);
    expect(await cache.get(text, state)).toEqual(response);
  });

  it("same state in different order produces same cache key", async () => {
    const state1: AxisState = {
      length: 1,
      friendliness: -1,
      euphemism: 0,
      formality: 0,
      punctuation: 0,
    };
    const state2: AxisState = {
      friendliness: -1,
      length: 1,
      punctuation: 0,
      formality: 0,
      euphemism: 0,
    };
    await cache.set(text, state1, response);
    expect(await cache.get(text, state2)).toEqual(response);
  });

  it("evicts oldest entries when max size exceeded", async () => {
    const maxSize = 5;
    cache = new TransformCache(maxSize);

    for (let i = 0; i < maxSize + 1; i++) {
      const s: AxisState = {
        length: i,
        friendliness: 0,
        euphemism: 0,
        formality: 0,
        punctuation: 0,
      };
      await cache.set(text, s, { text: `result-${i}`, disabled: [] });
    }

    const firstState: AxisState = {
      length: 0,
      friendliness: 0,
      euphemism: 0,
      formality: 0,
      punctuation: 0,
    };
    expect(await cache.get(text, firstState)).toBeNull();

    const lastState: AxisState = {
      length: maxSize,
      friendliness: 0,
      euphemism: 0,
      formality: 0,
      punctuation: 0,
    };
    expect(await cache.get(text, lastState)).toEqual({
      text: `result-${maxSize}`,
      disabled: [],
    });
  });
});
