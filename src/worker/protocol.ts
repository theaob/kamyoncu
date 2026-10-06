import type { Command, SimEvent, Speed } from '../core/types';

/** Arayüzün ihtiyaç duyduğu, sık değişen durum. Her tikte yalnızca bu gönderilir. */
export interface ClockView {
  time: number;
  speed: Speed;
  paused: boolean;
}

export type ToWorker = { type: 'init'; seed: number } | { type: 'command'; command: Command };

export type FromWorker =
  | { type: 'ready'; worldId: string; clock: ClockView }
  | { type: 'tick'; clock: ClockView; events: SimEvent[] };
