import { getCargo } from '../data/cargo';
import { getWorld } from '../data/worlds';
import { BALANCE, MINUTES_PER_DAY } from './balance';
import { createPlayerDriver, PLAYER_DRIVER_ID, refreshMarket } from './fleet';
import { refreshJobs } from './jobs';
import { createFinance, emptyAmounts } from './ledger';
import { Rng, withRng } from './rng';
import { INITIAL_JOB_FILL, SAVE_VERSION } from './sim';
import type { BodyKind, Finance, GameState, Job, Truck } from './types';

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
      trucks: [
        {
          id: 't1',
          modelId: 'van-used',
          cityId: BALANCE.startCityId,
          odometerKm: 184_000,
          trip: null,
        },
      ],
      jobs: [],
      finance: createFinance(),
    } as unknown as GameState;
    const rng = new Rng(state.rngState);
    refreshJobs(state, getWorld(state.activeWorldId), rng, INITIAL_JOB_FILL);
    state.rngState = rng.state;
    return state as unknown as AnyState;
  },
  // Faz 1 → Faz 2: filo, şoförler, dorseler, pazar; araç durumu ve kasa türü.
  2: (s) => {
    const state = { ...s, version: 3 } as unknown as GameState;
    const bodyOf = (job: Job): BodyKind => {
      try {
        return job.body ?? getCargo(job.cargo).body;
      } catch {
        return 'tenteli';
      }
    };
    const withBody = (job: Job): Job => ({ ...job, body: bodyOf(job) });
    const s0 = BALANCE.startingTruck;
    state.trucks = (state.trucks as unknown as Partial<Truck>[]).map((t, i) => ({
      id: t.id ?? `t${i + 1}`,
      plate: `34 KMY ${String(i + 1).padStart(2, '0')}`,
      modelId: t.modelId === 'van-used' || !t.modelId ? s0.modelId : t.modelId,
      body: 'tenteli',
      trailerId: null,
      driverId: i === 0 ? PLAYER_DRIVER_ID : null,
      cityId: t.cityId ?? BALANCE.startCityId,
      odometerKm: t.odometerKm ?? s0.odometerKm,
      condition: s0.condition,
      builtAt: -s0.ageYears * 365 * MINUTES_PER_DAY,
      trip: t.trip ? { ...t.trip, job: withBody(t.trip.job) } : null,
      serviceUntil: null,
    }));
    state.jobs = state.jobs.map(withBody);
    state.trailers = [];
    state.drivers = [createPlayerDriver()];
    const finance = state.finance as Finance;
    finance.totals = { ...emptyAmounts(), ...finance.totals };
    finance.days = finance.days.map((d) => ({
      ...d,
      amounts: { ...emptyAmounts(), ...d.amounts },
    }));
    withRng(state, (rng) => refreshMarket(state, getWorld(state.activeWorldId), rng));
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
    Array.isArray(g.trailers) &&
    Array.isArray(g.drivers) &&
    Array.isArray(g.candidates) &&
    Array.isArray(g.usedListings) &&
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
    try {
      s = migrate(s);
    } catch {
      // Eksik alanlı kayıt göç sırasında patlayabilir; bozuk sayılır.
      throw new SaveLoadError('corrupt');
    }
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
