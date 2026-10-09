import { CARGO_TYPES } from '../data/cargo';
import { VEHICLE_MODELS } from '../data/vehicles';
import { BALANCE, MINUTES_PER_HOUR } from './balance';
import { jobPay } from './economy';
import { pickWeighted, type Rng } from './rng';
import { findRoute } from './routing';
import type { City, GameState, Job, WorldDef } from './types';

const QUARTER_HOUR = 15;

function between(rng: Rng, [min, max]: readonly [number, number]): number {
  return min + rng.next() * (max - min);
}

function smallestFitting(tons: number) {
  return VEHICLE_MODELS.filter((m) => m.capacityTons >= tons).sort(
    (a, b) => a.capacityTons - b.capacityTons,
  )[0];
}

/** `from` şehrinden çıkan yeni bir ilan üretir. Uygun varış yoksa `null`. */
export function createJob(state: GameState, world: WorldDef, rng: Rng, from: City): Job | null {
  const targets = world.cities.filter((c) => c.id !== from.id);
  // Büyük şehirler daha sık varış noktasıdır.
  const to = pickWeighted(rng, targets, (c) => c.size * c.size);
  const route = findRoute(world, from.id, to.id);
  if (!route || route.km < BALANCE.minJobKm) return null;

  // Önce büyüklük sınıfı, sonra o aralığa düşen bir yük türü seçilir.
  const buckets = BALANCE.jobSizeBuckets;
  const bucketIndex = pickWeighted(rng, [...buckets.keys()], (i) => buckets[i]![1]);
  const min = bucketIndex === 0 ? 0 : buckets[bucketIndex - 1]![0];
  const max = buckets[bucketIndex]![0];
  const fitting = CARGO_TYPES.filter((c) => c.tons[0] < max && c.tons[1] > min);
  const cargo = pickWeighted(rng, fitting, (c) => c.frequency);
  const lo = Math.max(min, cargo.tons[0]);
  const hi = Math.min(max, cargo.tons[1]);
  const tons = Math.max(0.1, Math.min(hi, Math.round(between(rng, [lo, hi]) * 10) / 10));
  const demand = 0.9 + rng.next() * 0.3;
  // Teslim süresi, yükü taşıyabilecek en küçük aracın hızına göre ayarlanır.
  const speedFactor = smallestFitting(tons)?.speedFactor ?? 1;
  const driveMinutes =
    ((route.minutes / speedFactor) * between(rng, BALANCE.deadlineSlack)) / cargo.urgency +
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
    body: cargo.body,
    tons,
    km: route.km,
    pay: jobPay(route.km, cargo, tons, demand),
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
