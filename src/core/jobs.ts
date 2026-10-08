import { CARGO_TYPES } from '../data/cargo';
import { BALANCE, MINUTES_PER_HOUR } from './balance';
import { jobPay } from './economy';
import type { Rng } from './rng';
import { findRoute } from './routing';
import type { City, GameState, Job, WorldDef } from './types';

const QUARTER_HOUR = 15;

function pickWeighted<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let r = rng.next() * total;
  for (const item of items) {
    r -= weight(item);
    if (r < 0) return item;
  }
  return items[items.length - 1]!;
}

function between(rng: Rng, [min, max]: readonly [number, number]): number {
  return min + rng.next() * (max - min);
}

/** `from` şehrinden çıkan yeni bir ilan üretir. Uygun varış yoksa `null`. */
export function createJob(state: GameState, world: WorldDef, rng: Rng, from: City): Job | null {
  const targets = world.cities.filter((c) => c.id !== from.id);
  // Büyük şehirler daha sık varış noktasıdır.
  const to = pickWeighted(rng, targets, (c) => c.size * c.size);
  const route = findRoute(world, from.id, to.id);
  if (!route || route.km < BALANCE.minJobKm) return null;

  const cargo = pickWeighted(rng, CARGO_TYPES, (c) => c.frequency);
  const tons = Math.round(between(rng, cargo.tons) * 10) / 10;
  const demand = 0.9 + rng.next() * 0.3;
  const driveMinutes =
    (route.minutes * between(rng, BALANCE.deadlineSlack)) / cargo.urgency +
    BALANCE.loadingMinutes +
    BALANCE.unloadingMinutes +
    BALANCE.deadlineExtraHours * MINUTES_PER_HOUR;
  const deadline = Math.ceil((state.time + driveMinutes) / QUARTER_HOUR) * QUARTER_HOUR;
  const listing = Math.round(between(rng, BALANCE.jobListingHours) * MINUTES_PER_HOUR);

  return {
    id: `j${state.nextId++}`,
    from: from.id,
    to: to.id,
    cargo: cargo.id,
    tons,
    km: route.km,
    pay: jobPay(route.km, cargo, demand),
    deadline,
    expiresAt: Math.min(state.time + listing, deadline),
  };
}

/** Süresi geçen ilanları kaldırır, boş yuvaları olasılıkla doldurur. */
export function refreshJobs(state: GameState, world: WorldDef, rng: Rng, chance: number): void {
  state.jobs = state.jobs.filter((j) => j.expiresAt > state.time);
  for (const city of world.cities) {
    const listed = state.jobs.filter((j) => j.from === city.id).length;
    const slots = city.size * BALANCE.jobsPerCitySize - listed;
    for (let i = 0; i < slots; i++) {
      if (rng.next() >= chance) continue;
      const job = createJob(state, world, rng, city);
      if (job) state.jobs.push(job);
    }
  }
}
