import { BALANCE } from './balance';
import { applyCommand, step } from './sim';
import type { Command, GameState, SimEvent } from './types';

/** Oyuncunun ilgisini isteyen olaylar: boşa çıkan, bakım isteyen ya da bakımdan çıkan araç. */
export function needsAttention(event: SimEvent): boolean {
  return (
    event.code === 'job.delivered' ||
    event.code === 'job.deliveredLate' ||
    event.code === 'fleet.needsService' ||
    event.code === 'fleet.serviceDone'
  );
}

/**
 * Gerçek zamanı sabit adımlı simülasyon adımlarına çevirir.
 * Saat dışarıdan verilir (`advance(realMs)`), böylece testlerde sahte saat kullanılabilir.
 */
export class SimRunner {
  /** Henüz işlenmemiş oyun dakikası kesri. İleride harita interpolasyonu için kullanılacak. */
  private pending = 0;
  /** Açıksa ilgi isteyen bir olayda oyun o dakikada kendiliğinden duraklar. */
  autoPause = false;

  constructor(public readonly state: GameState) {}

  /** Geçen gerçek süreyi işler; oluşan olayları döndürür. */
  advance(realMs: number): SimEvent[] {
    const events: SimEvent[] = [];
    if (this.state.paused) return events;
    const ms = Math.min(Math.max(realMs, 0), BALANCE.maxRealMsPerAdvance);
    this.pending += (ms / 1000) * BALANCE.gameMinutesPerRealSecond * this.state.speed;
    while (this.pending >= 1) {
      const from = events.length;
      step(this.state, events);
      this.pending -= 1;
      if (this.autoPause && events.slice(from).some(needsAttention)) {
        this.state.paused = true;
        this.pending = 0;
        events.push({ code: 'time.autoPaused', params: {} });
        break;
      }
    }
    return events;
  }

  /** Adımlar arası ilerleme oranı [0, 1). */
  get alpha(): number {
    return this.pending;
  }

  apply(command: Command, events: SimEvent[] = []): void {
    applyCommand(this.state, command, events);
    if (this.state.paused) this.pending = 0;
  }
}
