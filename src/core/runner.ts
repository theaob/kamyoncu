import { BALANCE } from './balance';
import { applyCommand, step } from './sim';
import type { Command, GameState, SimEvent } from './types';

/**
 * Gerçek zamanı sabit adımlı simülasyon adımlarına çevirir.
 * Saat dışarıdan verilir (`advance(realMs)`), böylece testlerde sahte saat kullanılabilir.
 */
export class SimRunner {
  /** Henüz işlenmemiş oyun dakikası kesri. İleride harita interpolasyonu için kullanılacak. */
  private pending = 0;

  constructor(public readonly state: GameState) {}

  /** Geçen gerçek süreyi işler; oluşan olayları döndürür. */
  advance(realMs: number): SimEvent[] {
    const events: SimEvent[] = [];
    if (this.state.paused) return events;
    const ms = Math.min(Math.max(realMs, 0), BALANCE.maxRealMsPerAdvance);
    this.pending += (ms / 1000) * BALANCE.gameMinutesPerRealSecond * this.state.speed;
    while (this.pending >= 1) {
      step(this.state, events);
      this.pending -= 1;
    }
    return events;
  }

  /** Adımlar arası ilerleme oranı [0, 1). */
  get alpha(): number {
    return this.pending;
  }

  apply(command: Command): void {
    applyCommand(this.state, command);
    if (this.state.paused) this.pending = 0;
  }
}
