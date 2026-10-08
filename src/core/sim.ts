import { getVehicleModel } from '../data/vehicles';
import { getWorld } from '../data/worlds';
import { BALANCE, MINUTES_PER_DAY } from './balance';
import { latePenalty, legCost } from './economy';
import { refreshJobs } from './jobs';
import { Rng } from './rng';
import { findRoute, roadBetween } from './routing';
import type {
  AcceptError,
  Command,
  Finance,
  GameState,
  LedgerCategory,
  Money,
  SimEvent,
  Truck,
  WorldDef,
} from './types';

/** Kayıt biçimi sürümü. Biçim değiştiğinde artırılır ve göç (migration) yazılır (bkz. save.ts). */
export const SAVE_VERSION = 2;

/** Başlangıçta yük borsasındaki boş yuvaların dolma oranı. */
export const INITIAL_JOB_FILL = 0.6;

function emptyAmounts(): Record<LedgerCategory, Money> {
  return { freight: 0, fuel: 0, tolls: 0, penalties: 0 };
}

export function createFinance(): Finance {
  return { days: [], totals: emptyAmounts(), deliveries: 0, lateDeliveries: 0 };
}

export function createStartingTruck(): Truck {
  return {
    id: 't1',
    modelId: 'van-used',
    cityId: BALANCE.startCityId,
    odometerKm: 184_000,
    trip: null,
  };
}

export function createInitialState(seed: number): GameState {
  const state: GameState = {
    version: SAVE_VERSION,
    seed,
    rngState: seed | 0,
    time: 0,
    speed: 1,
    paused: false,
    activeWorldId: 'tr',
    money: BALANCE.startingMoney,
    nextId: 1,
    trucks: [createStartingTruck()],
    jobs: [],
    finance: createFinance(),
  };
  withRng(state, (rng) => refreshJobs(state, getWorld(state.activeWorldId), rng, INITIAL_JOB_FILL));
  return state;
}

/** RNG durumunu oyun durumunda tutar; böylece kayıttan devam eden oyun aynı sırayı izler. */
function withRng(state: GameState, fn: (rng: Rng) => void): void {
  const rng = new Rng(state.rngState);
  fn(rng);
  state.rngState = rng.state;
}

/** Gelir (+) veya gideri (−) nakde ve günlük dökümüne işler. */
export function book(state: GameState, category: LedgerCategory, amount: Money): void {
  if (amount === 0) return;
  const day = Math.floor(state.time / MINUTES_PER_DAY);
  const days = state.finance.days;
  let entry = days[days.length - 1];
  if (!entry || entry.day !== day) {
    entry = { day, amounts: emptyAmounts() };
    days.push(entry);
    if (days.length > BALANCE.ledgerDays) days.splice(0, days.length - BALANCE.ledgerDays);
  }
  entry.amounts[category] += amount;
  state.finance.totals[category] += amount;
  state.money += amount;
}

/**
 * Simülasyonu sabit bir adım (1 oyun dakikası) ilerletir.
 * Durumu yerinde değiştirir; oluşan olayları `events` dizisine ekler.
 */
export function step(
  state: GameState,
  events: SimEvent[],
  world: WorldDef = getWorld(state.activeWorldId),
): void {
  state.time += 1;
  if (state.time % MINUTES_PER_DAY === 0) {
    events.push({ code: 'time.newDay', params: { day: state.time / MINUTES_PER_DAY } });
  }
  if (state.time % BALANCE.jobSpawnIntervalMinutes === 0) {
    withRng(state, (rng) => refreshJobs(state, world, rng, BALANCE.jobSpawnChance));
  }
  for (const truck of state.trucks) advanceTruck(state, world, truck, events);
}

function advanceTruck(state: GameState, world: WorldDef, truck: Truck, events: SimEvent[]): void {
  const trip = truck.trip;
  if (!trip) return;
  if (trip.phase === 'loading' || trip.phase === 'unloading') {
    if (state.time >= trip.waitUntil) {
      if (trip.phase === 'loading') startDelivery(state, world, truck, events);
      else deliver(state, truck, events);
    }
    return;
  }
  const road = roadBetween(world, trip.route[trip.leg]!, trip.route[trip.leg + 1]!)!;
  const km = BALANCE.roadSpeedKmh[road.kind] / 60;
  trip.legKm += km;
  truck.odometerKm += km;
  if (trip.legKm >= road.km) {
    trip.leg += 1;
    trip.legKm = 0;
    truck.cityId = trip.route[trip.leg]!;
    beginLeg(state, world, truck);
  }
}

/**
 * Sıradaki yola çıkarken yakıt ve geçiş ücretini öder; rota bittiyse
 * yükleme veya boşaltmaya geçer.
 */
function beginLeg(state: GameState, world: WorldDef, truck: Truck): void {
  const trip = truck.trip!;
  if (trip.leg >= trip.route.length - 1) {
    if (trip.phase === 'toPickup') {
      trip.phase = 'loading';
      trip.waitUntil = state.time + BALANCE.loadingMinutes;
    } else {
      trip.phase = 'unloading';
      trip.waitUntil = state.time + BALANCE.unloadingMinutes;
    }
    return;
  }
  const road = roadBetween(world, trip.route[trip.leg]!, trip.route[trip.leg + 1]!)!;
  const model = getVehicleModel(truck.modelId);
  const load = trip.phase === 'toDelivery' ? trip.job.tons / model.capacityTons : 0;
  const cost = legCost(road, model, load);
  book(state, 'fuel', -cost.fuel);
  book(state, 'tolls', -cost.tolls);
  trip.costs += cost.fuel + cost.tolls;
}

function startDelivery(state: GameState, world: WorldDef, truck: Truck, events: SimEvent[]): void {
  const trip = truck.trip!;
  const route = findRoute(world, trip.job.from, trip.job.to)!;
  trip.phase = 'toDelivery';
  trip.route = route.cities;
  trip.leg = 0;
  trip.legKm = 0;
  events.push({ code: 'job.loaded', params: { city: trip.job.from, cargo: trip.job.cargo } });
  beginLeg(state, world, truck);
}

function deliver(state: GameState, truck: Truck, events: SimEvent[]): void {
  const { job, costs } = truck.trip!;
  const penalty = latePenalty(job, state.time);
  book(state, 'freight', job.pay);
  book(state, 'penalties', -penalty);
  state.finance.deliveries += 1;
  const profit = job.pay - penalty - costs;
  const base = { city: job.to, cargo: job.cargo, pay: job.pay, profit };
  if (penalty > 0) {
    state.finance.lateDeliveries += 1;
    events.push({ code: 'job.deliveredLate', params: { ...base, penalty } });
  } else {
    events.push({ code: 'job.delivered', params: base });
  }
  truck.trip = null;
}

/** Kabul edilebilirlik denetimi; arayüz düğmeleri de bunu kullanır. */
export function canAccept(
  state: GameState,
  world: WorldDef,
  jobId: string,
  truckId: string,
): AcceptError | null {
  const job = state.jobs.find((j) => j.id === jobId);
  const truck = state.trucks.find((t) => t.id === truckId);
  if (!job || !truck) return 'unknownJob';
  if (truck.trip) return 'truckBusy';
  if (job.tons > getVehicleModel(truck.modelId).capacityTons) return 'tooHeavy';
  if (!findRoute(world, truck.cityId, job.from) || !findRoute(world, job.from, job.to)) {
    return 'noRoute';
  }
  return null;
}

function acceptJob(
  state: GameState,
  world: WorldDef,
  jobId: string,
  truckId: string,
  events: SimEvent[],
): void {
  const error = canAccept(state, world, jobId, truckId);
  if (error) {
    events.push({ code: 'job.rejected', params: { reason: error } });
    return;
  }
  const job = state.jobs.find((j) => j.id === jobId)!;
  const truck = state.trucks.find((t) => t.id === truckId)!;
  state.jobs = state.jobs.filter((j) => j !== job);
  truck.trip = {
    job,
    phase: 'toPickup',
    route: findRoute(world, truck.cityId, job.from)!.cities,
    leg: 0,
    legKm: 0,
    waitUntil: 0,
    costs: 0,
  };
  events.push({ code: 'job.accepted', params: { from: job.from, to: job.to, cargo: job.cargo } });
  beginLeg(state, world, truck);
}

export function applyCommand(
  state: GameState,
  command: Command,
  events: SimEvent[] = [],
  world: WorldDef = getWorld(state.activeWorldId),
): void {
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
    case 'acceptJob':
      acceptJob(state, world, command.jobId, command.truckId, events);
      break;
  }
}
