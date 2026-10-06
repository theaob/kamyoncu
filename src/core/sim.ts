import { MINUTES_PER_DAY } from './balance';
import type { Command, GameState, SimEvent } from './types';

/** Kayıt biçimi sürümü. Biçim değiştiğinde artırılır ve göç (migration) yazılır. */
export const SAVE_VERSION = 1;

export function createInitialState(seed: number): GameState {
  return {
    version: SAVE_VERSION,
    seed,
    rngState: seed | 0,
    time: 0,
    speed: 1,
    paused: false,
    activeWorldId: 'tr',
  };
}

/**
 * Simülasyonu sabit bir adım (1 oyun dakikası) ilerletir.
 * Durumu yerinde değiştirir; oluşan olayları `events` dizisine ekler.
 */
export function step(state: GameState, events: SimEvent[]): void {
  state.time += 1;
  if (state.time % MINUTES_PER_DAY === 0) {
    events.push({ code: 'time.newDay', params: { day: state.time / MINUTES_PER_DAY } });
  }
}

export function applyCommand(state: GameState, command: Command): void {
  switch (command.type) {
    case 'setSpeed':
      state.speed = command.speed;
      state.paused = false;
      break;
    case 'setPaused':
      state.paused = command.paused;
      break;
    case 'togglePause':
      state.paused = !state.paused;
      break;
  }
}
