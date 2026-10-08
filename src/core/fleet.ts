import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import {
  getVehicleModel,
  newTruckPrice,
  REEFER_FUEL_FACTOR,
  TRAILER_PRICES,
  VEHICLE_MODELS,
} from '../data/vehicles';
import { BALANCE, MINUTES_PER_DAY } from './balance';
import type { TruckSpec } from './economy';
import { book } from './ledger';
import { pickWeighted, type Rng } from './rng';
import {
  LICENSES,
  RIGID_BODIES,
  TIERS,
  type BodyKind,
  type Candidate,
  type CommandError,
  type Driver,
  type GameState,
  type License,
  type Money,
  type SimEvent,
  type Trailer,
  type Truck,
  type UsedListing,
  type VehicleModel,
  type WorldDef,
} from './types';

const MINUTES_PER_YEAR = 365 * MINUTES_PER_DAY;

/** Ehliyet `held`, `needed` sınıfındaki aracı sürmeye yeter mi (CE ⊃ C ⊃ C1 ⊃ B). */
export function licenseCovers(held: License, needed: License): boolean {
  return LICENSES.indexOf(held) >= LICENSES.indexOf(needed);
}

/** Filo hesapları için gereken durum parçası; arayüz de kendi kopyasıyla çağırabilir. */
export type FleetState = Pick<GameState, 'trucks' | 'trailers' | 'drivers'>;

export function trailerOf(state: FleetState, truck: Truck): Trailer | undefined {
  return truck.trailerId ? state.trailers.find((t) => t.id === truck.trailerId) : undefined;
}

export function driverOf(state: FleetState, truck: Truck): Driver | undefined {
  return truck.driverId ? state.drivers.find((d) => d.id === truck.driverId) : undefined;
}

/** Aracın etkin değerleri: kasa/dorse, durum ve şoför becerisi dahil. */
export function truckSpec(state: FleetState, truck: Truck): TruckSpec {
  const model = getVehicleModel(truck.modelId);
  const body = model.tractor ? (trailerOf(state, truck)?.kind ?? null) : truck.body;
  const level = driverOf(state, truck)?.level ?? 1;
  const fuel =
    model.fuelPer100Km *
    (body === 'frigorifik' ? REEFER_FUEL_FACTOR : 1) *
    (1 + (100 - truck.condition) * BALANCE.conditionFuelPenalty) *
    (1 - (level - 1) * BALANCE.driverFuelSavingPerLevel);
  return {
    capacityTons: model.tractor && !body ? 0 : model.capacityTons,
    body,
    fuelPer100Km: fuel,
    speedFactor: model.speedFactor,
    tollClass: model.tollClass,
  };
}

/** Aracın bugünkü değeri (satış fiyatı): yaş, km ve duruma göre. */
export function vehicleValue(
  model: VehicleModel,
  body: BodyKind | null,
  builtAt: number,
  odometerKm: number,
  condition: number,
  now: number,
): Money {
  const d = BALANCE.depreciation;
  const years = Math.max(0, (now - builtAt) / MINUTES_PER_YEAR);
  const share = Math.max(d.floor, d.first * d.yearly ** years - odometerKm * d.perKm);
  const value = newTruckPrice(model, body) * share * (0.7 + (0.3 * condition) / 100);
  return Math.round(value / 100_000) * 100_000;
}

export function truckValue(truck: Truck, now: number): Money {
  const model = getVehicleModel(truck.modelId);
  return vehicleValue(model, truck.body, truck.builtAt, truck.odometerKm, truck.condition, now);
}

export function trailerValue(trailer: Trailer, now: number): Money {
  const years = Math.max(0, (now - trailer.builtAt) / MINUTES_PER_YEAR);
  const value = TRAILER_PRICES[trailer.kind] * Math.max(0.25, 0.9 * BALANCE.trailerYearly ** years);
  return Math.round(value / 100_000) * 100_000;
}

/** Bakım maliyeti ve süresi (dakika); araç zaten tam durumdaysa 0. */
export function serviceQuote(truck: Truck): { cost: Money; minutes: number } {
  const model = getVehicleModel(truck.modelId);
  const points = Math.max(0, 100 - truck.condition);
  return {
    cost: Math.round((model.price * BALANCE.serviceCostPerPoint * points) / 100) * 100,
    minutes: Math.ceil(points * BALANCE.serviceMinutesPerPoint),
  };
}

/** Plaka: İstanbul kodu + firma harfleri + sıra numarası. */
function nextPlate(state: GameState): string {
  const used = new Set(state.trucks.map((t) => t.plate));
  for (let n = 1; ; n++) {
    const plate = `34 KMY ${String(n).padStart(2, '0')}`;
    if (!used.has(plate)) return plate;
  }
}

function newTruck(
  state: GameState,
  fields: Pick<Truck, 'modelId' | 'body' | 'cityId' | 'odometerKm' | 'condition' | 'builtAt'>,
): Truck {
  return {
    id: `t${state.nextId++}`,
    plate: nextPlate(state),
    trailerId: null,
    driverId: null,
    trip: null,
    serviceUntil: null,
    ...fields,
  };
}

export function createStartingTruck(state: GameState): Truck {
  const s = BALANCE.startingTruck;
  return newTruck(state, {
    modelId: s.modelId,
    body: 'tenteli',
    cityId: BALANCE.startCityId,
    odometerKm: s.odometerKm,
    condition: s.condition,
    builtAt: state.time - s.ageYears * MINUTES_PER_YEAR,
  });
}

export const PLAYER_DRIVER_ID = 'p0';

export function createPlayerDriver(): Driver {
  return { id: PLAYER_DRIVER_ID, name: '', license: 'B', level: 1, salary: 0, isPlayer: true };
}

// ---------------------------------------------------------------------------
// Pazar ve şoför adayları (haftalık yenilenir)

function createCandidate(state: GameState, rng: Rng): Candidate {
  const license = pickWeighted(rng, BALANCE.driverLicenses, ([, w]) => w)[0];
  const level = pickWeighted(rng, [1, 2, 3, 4, 5], (l) => 6 - l);
  const name = `${FIRST_NAMES[rng.int(0, FIRST_NAMES.length - 1)]} ${LAST_NAMES[rng.int(0, LAST_NAMES.length - 1)]}`;
  const raw =
    BALANCE.driverBaseSalary[license] +
    (level - 1) * BALANCE.driverSalaryPerLevel +
    rng.int(-3, 3) * 1_000 * 100;
  return {
    id: `d${state.nextId++}`,
    name,
    license,
    level,
    salary: Math.round(raw / 100_000) * 100_000,
    isPlayer: false,
    expiresAt: state.time + BALANCE.marketRefreshDays * MINUTES_PER_DAY,
  };
}

function createUsedListing(state: GameState, world: WorldDef, rng: Rng): UsedListing {
  // Ucuz sınıflar ikinci elde daha sık bulunur.
  const model = pickWeighted(
    rng,
    VEHICLE_MODELS,
    (m) => (m.tier === 'premium' ? 1 : 2) / m.vehicleClass,
  );
  const body = model.tractor ? null : RIGID_BODIES[rng.next() < 0.75 ? 0 : 1]!;
  const ageYears = 2 + rng.next() * 10;
  const odometerKm = Math.round((ageYears * (40_000 + rng.next() * 80_000)) / 1000) * 1000;
  const condition = Math.round(35 + rng.next() * 50);
  const builtAt = state.time - Math.round(ageYears * MINUTES_PER_YEAR);
  const city = pickWeighted(rng, world.cities, (c) => c.size);
  const value = vehicleValue(model, body, builtAt, odometerKm, condition, state.time);
  return {
    id: `u${state.nextId++}`,
    modelId: model.id,
    body,
    cityId: city.id,
    odometerKm,
    condition,
    builtAt,
    price: Math.round((value * BALANCE.usedMarkup) / 100_000) * 100_000,
  };
}

/** Haftalık yenileme: aday ve ikinci el listesini baştan kurar. */
export function refreshMarket(state: GameState, world: WorldDef, rng: Rng): void {
  state.candidates = Array.from({ length: BALANCE.candidatesCount }, () =>
    createCandidate(state, rng),
  );
  state.usedListings = Array.from({ length: BALANCE.usedListingsCount }, () =>
    createUsedListing(state, world, rng),
  );
}

export function isMarketDay(time: number): boolean {
  return time % (BALANCE.marketRefreshDays * MINUTES_PER_DAY) === 0;
}

/** Günlük maaş ödemesi (aylık / 30). */
export function paySalaries(state: GameState): void {
  const daily = state.drivers.reduce((sum, d) => sum + d.salary, 0) / BALANCE.daysPerMonth;
  book(state, 'salaries', -Math.round(daily));
}

// ---------------------------------------------------------------------------
// Komutlar. Hata olursa nedenini döndürür, durumu değiştirmez.

type Result = CommandError | null;

function isIdle(truck: Truck): boolean {
  return truck.trip === null && truck.serviceUntil === null;
}

export function buyNewTruck(
  state: GameState,
  world: WorldDef,
  modelId: string,
  body: BodyKind | null,
  cityId: string,
  events: SimEvent[],
): Result {
  const model = VEHICLE_MODELS.find((m) => m.id === modelId);
  if (!model || !world.cities.some((c) => c.id === cityId)) return 'notFound';
  const chosenBody = model.tractor ? null : body;
  if (!model.tractor && (!chosenBody || !RIGID_BODIES.includes(chosenBody))) return 'noRigidBody';
  const price = newTruckPrice(model, chosenBody);
  if (state.money < price) return 'noMoney';
  const truck = newTruck(state, {
    modelId,
    body: chosenBody,
    cityId,
    odometerKm: 0,
    condition: 100,
    builtAt: state.time,
  });
  state.trucks.push(truck);
  book(state, 'vehicles', -price);
  events.push({
    code: 'fleet.bought',
    params: { plate: truck.plate, model: model.name, city: cityId, price },
  });
  return null;
}

export function buyUsedTruck(state: GameState, listingId: string, events: SimEvent[]): Result {
  const listing = state.usedListings.find((l) => l.id === listingId);
  if (!listing) return 'notFound';
  if (state.money < listing.price) return 'noMoney';
  const truck = newTruck(state, {
    modelId: listing.modelId,
    body: listing.body,
    cityId: listing.cityId,
    odometerKm: listing.odometerKm,
    condition: listing.condition,
    builtAt: listing.builtAt,
  });
  state.trucks.push(truck);
  state.usedListings = state.usedListings.filter((l) => l !== listing);
  book(state, 'vehicles', -listing.price);
  events.push({
    code: 'fleet.bought',
    params: {
      plate: truck.plate,
      model: getVehicleModel(listing.modelId).name,
      city: listing.cityId,
      price: listing.price,
    },
  });
  return null;
}

export function sellTruck(state: GameState, truckId: string, events: SimEvent[]): Result {
  const truck = state.trucks.find((t) => t.id === truckId);
  if (!truck) return 'notFound';
  if (!isIdle(truck)) return 'truckBusy';
  if (state.trucks.length === 1) return 'lastTruck';
  const trailer = trailerOf(state, truck);
  if (trailer) {
    trailer.truckId = null;
    trailer.cityId = truck.cityId;
  }
  const price = truckValue(truck, state.time);
  state.trucks = state.trucks.filter((t) => t !== truck);
  book(state, 'vehicles', price);
  events.push({ code: 'fleet.sold', params: { plate: truck.plate, price } });
  return null;
}

export function buyTrailer(
  state: GameState,
  world: WorldDef,
  kind: BodyKind,
  cityId: string,
  events: SimEvent[],
): Result {
  if (!(kind in TRAILER_PRICES) || !world.cities.some((c) => c.id === cityId)) return 'notFound';
  const price = TRAILER_PRICES[kind];
  if (state.money < price) return 'noMoney';
  state.trailers.push({
    id: `r${state.nextId++}`,
    kind,
    cityId,
    truckId: null,
    builtAt: state.time,
  });
  book(state, 'vehicles', -price);
  events.push({ code: 'fleet.trailerBought', params: { kind, city: cityId, price } });
  return null;
}

export function sellTrailer(state: GameState, trailerId: string, events: SimEvent[]): Result {
  const trailer = state.trailers.find((t) => t.id === trailerId);
  if (!trailer) return 'notFound';
  if (trailer.truckId) return 'trailerInUse';
  const price = trailerValue(trailer, state.time);
  state.trailers = state.trailers.filter((t) => t !== trailer);
  book(state, 'vehicles', price);
  events.push({ code: 'fleet.trailerSold', params: { kind: trailer.kind, price } });
  return null;
}

export function attachTrailer(state: GameState, truckId: string, trailerId: string): Result {
  const truck = state.trucks.find((t) => t.id === truckId);
  const trailer = state.trailers.find((t) => t.id === trailerId);
  if (!truck || !trailer) return 'notFound';
  if (!getVehicleModel(truck.modelId).tractor) return 'notTractor';
  if (!isIdle(truck)) return 'truckBusy';
  if (trailer.truckId) return 'trailerInUse';
  if (trailer.cityId !== truck.cityId) return 'differentCity';
  const current = trailerOf(state, truck);
  if (current) {
    current.truckId = null;
    current.cityId = truck.cityId;
  }
  trailer.truckId = truck.id;
  truck.trailerId = trailer.id;
  return null;
}

export function detachTrailer(state: GameState, truckId: string): Result {
  const truck = state.trucks.find((t) => t.id === truckId);
  if (!truck) return 'notFound';
  const trailer = trailerOf(state, truck);
  if (!trailer) return 'notFound';
  if (!isIdle(truck)) return 'truckBusy';
  trailer.truckId = null;
  trailer.cityId = truck.cityId;
  truck.trailerId = null;
  return null;
}

/** Dorse bağlı çekiciyle birlikte hareket eder; konumu çekicinin şehriyle eşitlenir. */
export function syncTrailerCities(state: GameState): void {
  for (const trailer of state.trailers) {
    if (!trailer.truckId) continue;
    const truck = state.trucks.find((t) => t.id === trailer.truckId);
    if (truck) trailer.cityId = truck.cityId;
  }
}

export function serviceTruck(state: GameState, truckId: string): Result {
  const truck = state.trucks.find((t) => t.id === truckId);
  if (!truck) return 'notFound';
  if (!isIdle(truck)) return 'truckBusy';
  const { cost, minutes } = serviceQuote(truck);
  if (minutes === 0) return 'notNeeded';
  if (state.money < cost) return 'noMoney';
  book(state, 'maintenance', -cost);
  truck.serviceUntil = state.time + minutes;
  return null;
}

/** Bakım süresi dolan araçları tam duruma getirir. */
export function finishServices(state: GameState, events: SimEvent[]): void {
  for (const truck of state.trucks) {
    if (truck.serviceUntil !== null && state.time >= truck.serviceUntil) {
      truck.serviceUntil = null;
      truck.condition = 100;
      events.push({ code: 'fleet.serviceDone', params: { plate: truck.plate } });
    }
  }
}

export function hireDriver(state: GameState, candidateId: string, events: SimEvent[]): Result {
  const candidate = state.candidates.find((c) => c.id === candidateId);
  if (!candidate) return 'notFound';
  const driver: Driver = {
    id: candidate.id,
    name: candidate.name,
    license: candidate.license,
    level: candidate.level,
    salary: candidate.salary,
    isPlayer: false,
  };
  state.drivers.push(driver);
  state.candidates = state.candidates.filter((c) => c !== candidate);
  events.push({ code: 'driver.hired', params: { name: driver.name } });
  return null;
}

export function fireDriver(state: GameState, driverId: string, events: SimEvent[]): Result {
  const driver = state.drivers.find((d) => d.id === driverId);
  if (!driver) return 'notFound';
  if (driver.isPlayer) return 'isPlayer';
  const truck = state.trucks.find((t) => t.driverId === driverId);
  if (truck && !isIdle(truck)) return 'driverBusy';
  if (truck) truck.driverId = null;
  state.drivers = state.drivers.filter((d) => d !== driver);
  events.push({ code: 'driver.fired', params: { name: driver.name } });
  return null;
}

/**
 * Şoförü araca atar (`truckId` null ise araçtan indirir). Şoför başka bir boştaki
 * araçtaysa oradan alınır. Faz 2 sadeleştirmesi: şoför aracın bulunduğu şehre
 * kendiliğinden ulaşır (şubeler Faz 3'te).
 */
export function assignDriver(state: GameState, driverId: string, truckId: string | null): Result {
  const driver = state.drivers.find((d) => d.id === driverId);
  if (!driver) return 'notFound';
  const current = state.trucks.find((t) => t.driverId === driverId);
  if (current && !isIdle(current)) return 'driverBusy';
  if (truckId === null) {
    if (current) current.driverId = null;
    return null;
  }
  const truck = state.trucks.find((t) => t.id === truckId);
  if (!truck) return 'notFound';
  if (!isIdle(truck)) return 'truckBusy';
  if (!licenseCovers(driver.license, getVehicleModel(truck.modelId).license)) return 'license';
  if (current) current.driverId = null;
  truck.driverId = driverId;
  return null;
}

/** Testler ve göç için: tüm modeller ve seviyeler katalogda. */
export const CATALOG_TIERS = TIERS;
