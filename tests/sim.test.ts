import { describe, expect, it } from 'vitest';
import { BALANCE, MINUTES_PER_DAY } from '../src/core/balance';
import { SimRunner } from '../src/core/runner';
import { applyCommand, createInitialState, SAVE_VERSION, step } from '../src/core/sim';
import type { SimEvent } from '../src/core/types';

describe('sim', () => {
  it('başlangıç durumu serileştirilebilir ve sürümlü', () => {
    const s = createInitialState(123);
    expect(s.version).toBe(SAVE_VERSION);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it('her adım bir oyun dakikası; gün dönümünde olay üretir', () => {
    const s = createInitialState(1);
    const events: SimEvent[] = [];
    for (let i = 0; i < MINUTES_PER_DAY * 2; i++) step(s, events);
    expect(s.time).toBe(MINUTES_PER_DAY * 2);
    expect(events).toEqual([
      { code: 'time.newDay', params: { day: 1 } },
      { code: 'time.newDay', params: { day: 2 } },
    ]);
  });

  it('hız komutu duraklatmayı kaldırır; togglePause tersine çevirir', () => {
    const s = createInitialState(1);
    applyCommand(s, { type: 'togglePause' });
    expect(s.paused).toBe(true);
    applyCommand(s, { type: 'setSpeed', speed: 8 });
    expect(s).toMatchObject({ paused: false, speed: 8 });
  });
});

describe('SimRunner', () => {
  const perSecond = BALANCE.gameMinutesPerRealSecond;

  it('gerçek zamanı hıza göre oyun dakikasına çevirir', () => {
    const r = new SimRunner(createInitialState(1));
    r.apply({ type: 'setSpeed', speed: 4 });
    for (let i = 0; i < 20; i++) r.advance(50); // 1 gerçek saniye
    expect(r.state.time).toBe(4 * perSecond);
  });

  it('duraklatılmışken zaman ilerlemez', () => {
    const r = new SimRunner(createInitialState(1));
    r.apply({ type: 'setPaused', paused: true });
    r.advance(200);
    expect(r.state.time).toBe(0);
  });

  it('tek seferde işlenen süre sınırlanır (sekme uykusu)', () => {
    const r = new SimRunner(createInitialState(1));
    r.apply({ type: 'setSpeed', speed: 16 });
    r.advance(60_000);
    const max = (BALANCE.maxRealMsPerAdvance / 1000) * perSecond * 16;
    expect(r.state.time).toBeLessThanOrEqual(Math.ceil(max));
  });

  it('kesirli ilerleme kaybolmaz', () => {
    const r = new SimRunner(createInitialState(1));
    // 1× hızda 50 ms = 0,05 dk; 400 tik = 20 sn
    for (let i = 0; i < 400; i++) r.advance(50);
    expect(r.state.time).toBe(Math.round(20 * perSecond));
  });

  it('aynı tohum ve girdilerle deterministik', () => {
    const run = () => {
      const r = new SimRunner(createInitialState(5));
      r.apply({ type: 'setSpeed', speed: 16 });
      for (let i = 0; i < 2000; i++) r.advance(50);
      return JSON.stringify(r.state);
    };
    expect(run()).toBe(run());
  });
});
