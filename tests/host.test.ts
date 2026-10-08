import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/sim';
import { serialize } from '../src/core/save';
import type { FromWorker } from '../src/worker/protocol';
import { AUTOSAVE_MS, SimHost } from '../src/worker/host';

function setup(now = () => 0) {
  const out: FromWorker[] = [];
  const host = new SimHost((m) => out.push(m), now);
  return { out, host };
}

describe('SimHost (worker protokolü)', () => {
  it('init sonrası ready, zaman ilerleyince tick gönderir', () => {
    let now = 0;
    const { out, host } = setup(() => now);
    host.tick(); // init öncesi sessiz
    expect(out).toHaveLength(0);

    host.handle({ type: 'init', seed: 1 });
    expect(out[0]).toMatchObject({ type: 'ready', worldId: 'tr' });
    if (out[0]?.type === 'ready') expect(out[0].view.jobs.length).toBeGreaterThan(0);

    host.handle({ type: 'command', command: { type: 'setSpeed', speed: 16 } });
    now += 250;
    host.tick();
    const last = out.at(-1);
    expect(last?.type).toBe('tick');
    if (last?.type === 'tick') expect(last.clock.time).toBeGreaterThan(0);
  });

  it('zaman ilerlemediyse mesaj göndermez', () => {
    const { out, host } = setup();
    host.handle({ type: 'init', seed: 1 });
    host.handle({ type: 'command', command: { type: 'setPaused', paused: true } });
    const count = out.length;
    host.tick();
    expect(out).toHaveLength(count);
  });

  it('yük borsasını yalnızca değişince gönderir', () => {
    let now = 0;
    const { out, host } = setup(() => now);
    host.handle({ type: 'init', seed: 1 });
    host.handle({ type: 'command', command: { type: 'setSpeed', speed: 16 } });
    now += 50;
    host.tick();
    const tick = out.at(-1);
    expect(tick?.type).toBe('tick');
    if (tick?.type === 'tick') expect(tick.view.jobs).toBeUndefined();

    const ready = out[0]!;
    // Başlangıç kamyonetine uyan (tenteli, ≤ 1,5 t) ilk ilan.
    const jobId =
      ready.type === 'ready'
        ? ready.view.jobs.find((j) => j.body === 'tenteli' && j.tons <= 1.5)!.id
        : '';
    host.handle({ type: 'command', command: { type: 'acceptJob', jobId, truckId: 't1' } });
    const afterAccept = out.filter((m) => m.type === 'tick').at(-1);
    expect(afterAccept?.type === 'tick' && afterAccept.view.jobs?.length).toBeGreaterThan(0);
    // Kabul sonrası hemen kaydedilir.
    expect(out.at(-1)?.type).toBe('save');
  });

  it('kayıtla başlatılınca kaldığı yerden devam eder; bozuk kayıtta yeni oyun', () => {
    const saved = createInitialState(3);
    saved.time = 999;
    const a = setup();
    a.host.handle({ type: 'init', seed: 1, save: serialize(saved) });
    expect(a.out[0]).toMatchObject({ type: 'ready', clock: { time: 999, paused: true } });

    const b = setup();
    b.host.handle({ type: 'init', seed: 1, save: '{bozuk' });
    expect(b.out[0]).toMatchObject({ type: 'ready', loadError: 'corrupt', clock: { time: 0 } });
  });

  it('belirli aralıkla otomatik kaydeder', () => {
    let now = 0;
    const { out, host } = setup(() => now);
    host.handle({ type: 'init', seed: 1 });
    host.handle({ type: 'command', command: { type: 'setSpeed', speed: 16 } });
    now += 100;
    host.tick();
    expect(out.some((m) => m.type === 'save')).toBe(false);
    now += AUTOSAVE_MS;
    host.tick();
    host.tick();
    expect(out.filter((m) => m.type === 'save')).toHaveLength(1);
  });
});
