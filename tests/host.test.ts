import { describe, expect, it } from 'vitest';
import type { FromWorker } from '../src/worker/protocol';
import { SimHost } from '../src/worker/host';

describe('SimHost (worker protokolü)', () => {
  it('init sonrası ready, zaman ilerleyince tick gönderir', () => {
    const out: FromWorker[] = [];
    let now = 0;
    const host = new SimHost(
      (m) => out.push(m),
      () => now,
    );
    host.tick(); // init öncesi sessiz
    expect(out).toHaveLength(0);

    host.handle({ type: 'init', seed: 1 });
    expect(out[0]).toMatchObject({ type: 'ready', worldId: 'tr' });

    host.handle({ type: 'command', command: { type: 'setSpeed', speed: 16 } });
    now += 250;
    host.tick();
    const last = out.at(-1);
    expect(last?.type).toBe('tick');
    if (last?.type === 'tick') expect(last.clock.time).toBeGreaterThan(0);
  });

  it('zaman ilerlemediyse mesaj göndermez', () => {
    const out: FromWorker[] = [];
    const host = new SimHost(
      (m) => out.push(m),
      () => 0,
    );
    host.handle({ type: 'init', seed: 1 });
    host.handle({ type: 'command', command: { type: 'setPaused', paused: true } });
    const count = out.length;
    host.tick();
    expect(out).toHaveLength(count);
  });
});
