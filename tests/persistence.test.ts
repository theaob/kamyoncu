import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readSave, SAVE_KEY } from '../src/store/persistence';

class MemoryStorage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

const save = (version: number, time: number) => JSON.stringify({ version, time });

describe('ortak kayıt yuvası', () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
    (globalThis as { localStorage?: unknown }).localStorage = storage;
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('ortak kayıt varsa onu okur', () => {
    storage.setItem(SAVE_KEY, save(3, 10));
    storage.setItem(`${SAVE_KEY}.feat-x`, save(3, 999));
    expect(readSave()).toBe(save(3, 10));
  });

  it('ortak kayıt yoksa dala özel eski kayıtların en ilerisini devralır', () => {
    storage.setItem(`${SAVE_KEY}.a`, save(3, 50));
    storage.setItem(`${SAVE_KEY}.b`, save(3, 400));
    storage.setItem(`${SAVE_KEY}.b.backup`, save(9, 9999));
    storage.setItem(`${SAVE_KEY}.c`, save(2, 9000));
    expect(readSave()).toBe(save(3, 400));
  });

  it('hiç kayıt yoksa null döner', () => {
    storage.setItem(`${SAVE_KEY}.backup`, save(3, 1));
    storage.setItem('kamyoncu.lang', 'tr');
    expect(readSave()).toBeNull();
  });
});
