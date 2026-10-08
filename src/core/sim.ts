import { getVehicleModel } from '../data/vehicles';
import { getWorld } from '../data/worlds';
import { BALANCE, MINUTES_PER_DAY } from './balance';
import { latePenalty, legCost } from './economy';
import {
  attachTrailer,
  buyNewTruck,
  buyTrailer,
  buyUsedTruck,
  createPlayerDriver,
  createStartingTruck,
  detachTrailer,
  driverOf,
  finishServices,
  fireDriver,
  hireDriver,
  isMarketDay,
  licenseCovers,
  paySalaries,
  refreshMarket,
  sellTrailer,
  sellTruck,
  serviceTruck,
  syncTrailerCities,
  truckSpec,
  assignDriver,
  PLAYER_DRIVER_ID,
} from './fleet';
import { refreshJobs } from './jobs';
import { book, createFinance } from './ledger';
import { withRng } from './rng';
import { findRoute, roadBetween } from './routing';
import type {
  AcceptError,
  Command,
  CommandError,
  GameState,
  SimEvent,
  Truck,
  WorldDef,
} from './types';

/** Kayıt biçimi sürümü. Biçim değiştiğinde artırılır ve göç (migration) yazılır (bkz. save.ts). */
export const SAVE_VERSION = 3;

/** Başlangıçta yük borsasındaki boş yuvaların dolma oranı. */
export const INITIAL_JOB_FILL = 0.6;

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
    trucks: [],
    trailers: [],
    drivers: [createPlayerDriver()],
    candidates: [],
    usedListings: [],
    jobs: [],
    finance: createFinance(),
  };
  const truck = createStartingTruck(state);
  truck.driverId = PLAYER_DRIVER_ID;
  state.trucks.push(truck);
  const world = getWorld(state.activeWorldId);
  withRng(state, (rng) => {
    refreshJobs(state, world, rng, INITIAL_JOB_FILL);
    refreshMarket(state, world, rng);
  });
  return state;
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
    paySalaries(state);
  }
  if (isMarketDay(state.time)) {
    withRng(state, (rng) => refreshMarket(state, world, rng));
    events.push({ code: 'market.refreshed', params: {} });
  }
  if (state.time % BALANCE.jobSpawnIntervalMinutes === 0) {
    withRng(state, (rng) => refreshJobs(state, world, rng, BALANCE.jobSpawnChance));
  }
  finishServices(state, events);
  for (const truck of state.trucks) advanceTruck(state, world, truck, events);
  syncTrailerCities(state);
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
  const model = getVehicleModel(truck.modelId);
  const km = Math.min(
    (BALANCE.roadSpeedKmh[road.kind] * model.speedFactor) / 60,
    road.km - trip.legKm,
  );
  trip.legKm += km;
  truck.odometerKm += km;
  wear(truck, km * model.wearPerKm, events);
  if (trip.legKm >= road.km - 1e-9) {
    trip.leg += 1;
    trip.legKm = 0;
    truck.cityId = trip.route[trip.leg]!;
    beginLeg(state, world, truck);
  }
}

/** Kilometreyle durum kaybı; iş alma sınırının altına inince bir kez uyarır. */
function wear(truck: Truck, points: number, events: SimEvent[]): void {
  const before = truck.condition;
  truck.condition = Math.max(0, before - points);
  if (before >= BALANCE.minConditionForJobs && truck.condition < BALANCE.minConditionForJobs) {
    events.push({ code: 'fleet.needsService', params: { plate: truck.plate } });
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
  const spec = truckSpec(state, truck);
  const load =
    trip.phase === 'toDelivery' && spec.capacityTons > 0
      ? Math.min(trip.job.tons / spec.capacityTons, 1)
      : 0;
  const cost = legCost(road, spec, load);
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
  events.push({
    code: 'job.loaded',
    params: { plate: truck.plate, city: trip.job.from, cargo: trip.job.cargo },
  });
  beginLeg(state, world, truck);
}

function deliver(state: GameState, truck: Truck, events: SimEvent[]): void {
  const { job, costs } = truck.trip!;
  const penalty = latePenalty(job, state.time);
  book(state, 'freight', job.pay);
  book(state, 'penalties', -penalty);
  state.finance.deliveries += 1;
  const profit = job.pay - penalty - costs;
  const base = { plate: truck.plate, city: job.to, cargo: job.cargo, pay: job.pay, profit };
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
  state: Pick<GameState, 'jobs' | 'trucks' | 'trailers' | 'drivers'>,
  world: WorldDef,
  jobId: string,
  truckId: string,
): AcceptError | null {
  const job = state.jobs.find((j) => j.id === jobId);
  const truck = state.trucks.find((t) => t.id === truckId);
  if (!job || !truck) return 'unknownJob';
  if (truck.trip) return 'truckBusy';
  if (truck.serviceUntil !== null) return 'inService';
  const driver = driverOf(state, truck);
  if (!driver) return 'noDriver';
  const model = getVehicleModel(truck.modelId);
  if (!licenseCovers(driver.license, model.license)) return 'license';
  const spec = truckSpec(state, truck);
  if (!spec.body) return 'noTrailer';
  if (spec.body !== job.body) return 'wrongBody';
  if (job.tons > spec.capacityTons) return 'tooHeavy';
  if (truck.condition < BALANCE.minConditionForJobs) return 'needsService';
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
  events.push({
    code: 'job.accepted',
    params: { plate: truck.plate, from: job.from, to: job.to, cargo: job.cargo },
  });
  beginLeg(state, world, truck);
}

/** Filo/şoför komutları: hata olursa `command.failed` olayı yayınlanır. */
function fleetCommand(
  state: GameState,
  world: WorldDef,
  command: Command,
  events: SimEvent[],
): CommandError | null {
  switch (command.type) {
    case 'buyNewTruck':
      return buyNewTruck(state, world, command.modelId, command.body, command.cityId, events);
    case 'buyUsedTruck':
      return buyUsedTruck(state, command.listingId, events);
    case 'sellTruck':
      return sellTruck(state, command.truckId, events);
    case 'buyTrailer':
      return buyTrailer(state, world, command.kind, command.cityId, events);
    case 'sellTrailer':
      return sellTrailer(state, command.trailerId, events);
    case 'attachTrailer':
      return attachTrailer(state, command.truckId, command.trailerId);
    case 'detachTrailer':
      return detachTrailer(state, command.truckId);
    case 'serviceTruck':
      return serviceTruck(state, command.truckId);
    case 'hireDriver':
      return hireDriver(state, command.candidateId, events);
    case 'fireDriver':
      return fireDriver(state, command.driverId, events);
    case 'assignDriver':
      return assignDriver(state, command.driverId, command.truckId);
    default:
      return null;
  }
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
    default: {
      const error = fleetCommand(state, world, command, events);
      if (error) events.push({ code: 'command.failed', params: { reason: error } });
    }
  }
}
