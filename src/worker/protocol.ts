import type { SaveError } from '../core/save';
import type {
  Candidate,
  Command,
  Driver,
  Finance,
  Job,
  Money,
  SimEvent,
  Speed,
  Trailer,
  Truck,
  UsedListing,
} from '../core/types';

/** Arayüzün ihtiyaç duyduğu, sık değişen durum. Her tikte gönderilir. */
export interface ClockView {
  time: number;
  speed: Speed;
  paused: boolean;
}

/**
 * Oyun durumunun arayüze giden kısmı. Para ve filo (araç, dorse, şoför) her
 * tikte gelir; borsa, pazar ve finans yalnızca değiştiklerinde (plan 5.2: farklar).
 */
export interface GameView {
  money: Money;
  trucks: Truck[];
  trailers: Trailer[];
  drivers: Driver[];
  jobs: Job[];
  candidates: Candidate[];
  usedListings: UsedListing[];
  finance: Finance;
}

/** Her tikte gönderilen alanlar. */
export type FleetView = Pick<GameView, 'money' | 'trucks' | 'trailers' | 'drivers'>;

export type ToWorker =
  | { type: 'init'; seed: number; save?: string | null; autoPause?: boolean }
  | { type: 'newGame'; seed: number }
  | { type: 'command'; command: Command }
  | { type: 'save' }
  /** Arayüz tercihi; kayda girmez. */
  | { type: 'setAutoPause'; on: boolean };

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
      view: FleetView & Partial<GameView>;
    }
  /** Otomatik kayıt: serileştirilmiş `GameState`; ana iş parçacığı depolar. */
  | { type: 'save'; data: string };
