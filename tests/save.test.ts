import { describe, expect, it } from 'vitest';
import { MINUTES_PER_DAY } from '../src/core/balance';
import { deserialize, SaveLoadError, serialize } from '../src/core/save';
import { applyCommand, createInitialState, SAVE_VERSION, step } from '../src/core/sim';
import type { SimEvent } from '../src/core/types';

function reason(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof SaveLoadError ? e.reason : 'other';
  }
  return undefined;
}

describe('kayıt', () => {
  it('kaydet → yükle aynı durumu verir (duraklatılmış başlar)', () => {
    const s = createInitialState(9);
    applyCommand(s, { type: 'acceptJob', jobId: s.jobs[0]!.id, truckId: 't1' });
    for (let i = 0; i < 500; i++) step(s, []);
    const loaded = deserialize(serialize(s));
    expect(loaded).toEqual({ ...s, paused: true });
  });

  it('yüklenen oyun kaldığı yerden aynı şekilde devam eder (RNG dahil)', () => {
    const a = createInitialState(11);
    for (let i = 0; i < 300; i++) step(a, []);
    const b = deserialize(serialize(a));
    b.paused = a.paused;
    const ea: SimEvent[] = [];
    const eb: SimEvent[] = [];
    for (let i = 0; i < MINUTES_PER_DAY; i++) {
      step(a, ea);
      step(b, eb);
    }
    expect(b).toEqual(a);
    expect(eb).toEqual(ea);
  });

  it('Faz 0 (sürüm 1) kaydı göç ettirilir', () => {
    const v1 = {
      version: 1,
      seed: 5,
      rngState: 5,
      time: 1234,
      speed: 4,
      paused: false,
      activeWorldId: 'tr',
    };
    const s = deserialize(JSON.stringify(v1));
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.time).toBe(1234);
    expect(s.trucks).toHaveLength(1);
    expect(s.jobs.length).toBeGreaterThan(0);
    expect(s.money).toBeGreaterThan(0);
    step(s, []); // göç sonrası çalışır
  });

  it('bozuk ya da daha yeni sürüm kayıtlar reddedilir', () => {
    expect(reason(() => deserialize('{nope'))).toBe('corrupt');
    expect(reason(() => deserialize('null'))).toBe('corrupt');
    expect(reason(() => deserialize('{"version":2}'))).toBe('corrupt');
    expect(reason(() => deserialize(JSON.stringify({ version: SAVE_VERSION + 1 })))).toBe('tooNew');
    const s = createInitialState(1);
    expect(reason(() => deserialize(serialize({ ...s, activeWorldId: 'mars' })))).toBe('corrupt');
  });
});
