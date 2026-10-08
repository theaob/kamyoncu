import { getWorld } from '../data/worlds';
import { INITIAL_JOB_FILL, createFinance, createStartingTruck, SAVE_VERSION } from './sim';
import { BALANCE } from './balance';
import { refreshJobs } from './jobs';
import { Rng } from './rng';
import type { GameState } from './types';

/**
 * Kayıt biçimi: `GameState`'in JSON hâli. Her sürüm değişikliği için bir göç
 * yazılır; eski kayıtlar sırayla güncel sürüme taşınır (plan 5.5).
 */
export type SaveError = 'corrupt' | 'tooNew';

export class SaveLoadError extends Error {
  constructor(public readonly reason: SaveError) {
    super(`Kayıt yüklenemedi: ${reason}`);
  }
}

type AnyState = Record<string, unknown> & { version: number };

/** `MIGRATIONS[n]`: n sürümündeki kaydı n + 1 sürümüne taşır. */
const MIGRATIONS: Record<number, (s: AnyState) => AnyState> = {
  // Faz 0 → Faz 1: para, kamyon, yük borsası ve finans eklendi.
  1: (s) => {
    const state = {
      ...s,
      version: 2,
      money: BALANCE.startingMoney,
      nextId: 1,
      trucks: [createStartingTruck()],
      jobs: [],
      finance: createFinance(),
    } as unknown as GameState;
    const rng = new Rng(state.rngState);
    refreshJobs(state, getWorld(state.activeWorldId), rng, INITIAL_JOB_FILL);
    state.rngState = rng.state;
    return state as unknown as AnyState;
  },
};

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

function looksValid(s: AnyState): boolean {
  const g = s as unknown as GameState;
  return (
    typeof g.time === 'number' &&
    typeof g.money === 'number' &&
    typeof g.rngState === 'number' &&
    typeof g.activeWorldId === 'string' &&
    Array.isArray(g.trucks) &&
    g.trucks.length > 0 &&
    Array.isArray(g.jobs) &&
    typeof g.finance === 'object' &&
    g.finance !== null
  );
}

/** Kaydı çözer, gerekirse göç ettirir. Yüklenen oyun duraklatılmış başlar. */
export function deserialize(json: string): GameState {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new SaveLoadError('corrupt');
  }
  if (typeof data !== 'object' || data === null) throw new SaveLoadError('corrupt');
  let s = data as AnyState;
  if (!Number.isInteger(s.version) || s.version < 1) throw new SaveLoadError('corrupt');
  if (s.version > SAVE_VERSION) throw new SaveLoadError('tooNew');
  while (s.version < SAVE_VERSION) {
    const migrate = MIGRATIONS[s.version];
    if (!migrate) throw new SaveLoadError('corrupt');
    s = migrate(s);
  }
  if (!looksValid(s)) throw new SaveLoadError('corrupt');
  const state = s as unknown as GameState;
  try {
    getWorld(state.activeWorldId);
  } catch {
    throw new SaveLoadError('corrupt');
  }
  state.paused = true;
  return state;
}
