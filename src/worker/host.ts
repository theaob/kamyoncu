import { SimRunner } from '../core/runner';
import { createInitialState } from '../core/sim';
import type { FromWorker, ToWorker } from './protocol';

/**
 * Worker içindeki simülasyon döngüsü. Worker API'sinden bağımsız yazıldı;
 * `post` ve `now` dışarıdan verilir, böylece testte doğrudan çalıştırılabilir.
 */
export class SimHost {
  private runner: SimRunner | null = null;
  private last = 0;

  constructor(
    private readonly post: (msg: FromWorker) => void,
    private readonly now: () => number,
  ) {}

  handle(msg: ToWorker): void {
    if (msg.type === 'init') {
      this.runner = new SimRunner(createInitialState(msg.seed));
      this.last = this.now();
      this.post({
        type: 'ready',
        worldId: this.runner.state.activeWorldId,
        clock: this.clock(),
      });
      return;
    }
    if (!this.runner) return;
    this.runner.apply(msg.command);
    this.post({ type: 'tick', clock: this.clock(), events: [] });
  }

  /** Periyodik olarak çağrılır; zaman ilerlediyse arayüze bildirir. */
  tick(): void {
    if (!this.runner) return;
    const now = this.now();
    const before = this.runner.state.time;
    const events = this.runner.advance(now - this.last);
    this.last = now;
    if (this.runner.state.time !== before || events.length > 0) {
      this.post({ type: 'tick', clock: this.clock(), events });
    }
  }

  private clock() {
    const s = this.runner!.state;
    return { time: s.time, speed: s.speed, paused: s.paused };
  }
}
