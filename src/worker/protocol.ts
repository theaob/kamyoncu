import type { SaveError } from '../core/save';
import type { Command, Finance, Job, Money, SimEvent, Speed, Truck } from '../core/types';

/** Arayüzün ihtiyaç duyduğu, sık değişen durum. Her tikte gönderilir. */
export interface ClockView {
  time: number;
  speed: Speed;
  paused: boolean;
}

/**
 * Oyun durumunun arayüze giden kısmı. `money` ve `trucks` her tikte gelir;
 * `jobs` ve `finance` yalnızca değiştiklerinde (plan 5.2: farklar).
 */
export interface GameView {
  money: Money;
  trucks: Truck[];
  jobs: Job[];
  finance: Finance;
}

export type ToWorker =
  | { type: 'init'; seed: number; save?: string | null }
  | { type: 'newGame'; seed: number }
  | { type: 'command'; command: Command }
  | { type: 'save' };

export type FromWorker =
  | {
      type: 'ready';
      worldId: string;
      clock: ClockView;
      view: GameView;
      /** Kayıt yüklenemediyse neden; yeni oyun başlatılmıştır. */
      loadError?: SaveError;
    }
  | {
      type: 'tick';
      clock: ClockView;
      events: SimEvent[];
      view: Pick<GameView, 'money' | 'trucks'> & Partial<Pick<GameView, 'jobs' | 'finance'>>;
    }
  /** Otomatik kayıt: serileştirilmiş `GameState`; ana iş parçacığı depolar. */
  | { type: 'save'; data: string };
