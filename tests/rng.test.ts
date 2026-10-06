import { describe, expect, it } from 'vitest';
import { Rng, nextRandom } from '../src/core/rng';

describe('rng', () => {
  it('aynı tohumla aynı diziyi üretir', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('farklı tohumlarla farklı dizi üretir', () => {
    expect(new Rng(1).next()).not.toEqual(new Rng(2).next());
  });

  it('değerler [0, 1) aralığında', () => {
    let state = 7;
    for (let i = 0; i < 10_000; i++) {
      const [v, next] = nextRandom(state);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      state = next;
    }
  });

  it('durum kaydedilip sürdürülebilir', () => {
    const a = new Rng(99);
    a.next();
    const saved = a.state;
    const expected = a.next();
    expect(new Rng(saved).next()).toBe(expected);
  });

  it('int sınırları kapsar', () => {
    const r = new Rng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(r.int(1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });
});
