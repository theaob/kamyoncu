import { BALANCE, MINUTES_PER_HOUR } from './balance';
import { findRoute, motorwayToll, roadBetween, roadMinutes, roadToll } from './routing';
import type { BodyKind, CargoType, Job, Money, Road, Truck, VehicleModel, WorldDef } from './types';

/**
 * Bir aracın iş hesaplarında kullanılan etkin değerleri: model + kasa/dorse +
 * durum + şoför becerisi birleşimi (bkz. fleet.ts `truckSpec`).
 */
export interface TruckSpec {
  /** Taşıyabileceği yük; dorsesiz çekicide 0. */
  capacityTons: number;
  /** Kasa ya da takılı dorse türü; dorsesiz çekicide `null`. */
  body: BodyKind | null;
  /** Boşken etkin tüketim, L/100 km. */
  fuelPer100Km: number;
  speedFactor: number;
  tollClass: VehicleModel['tollClass'];
}

/** Plan 3.6: yakıt_L = mesafe_km / 100 × tüketim × (1 + 0,35 × yük_oranı). */
export function fuelLiters(km: number, fuelPer100Km: number, loadRatio: number): number {
  return (km / 100) * fuelPer100Km * (1 + BALANCE.fuelLoadFactor * loadRatio);
}

export function fuelCost(km: number, fuelPer100Km: number, loadRatio: number): Money {
  return Math.round(fuelLiters(km, fuelPer100Km, loadRatio) * BALANCE.dieselPerLiter);
}

/** Bir yolun yakıt + geçiş ücreti. */
export function legCost(road: Road, spec: TruckSpec, loadRatio: number) {
  return {
    fuel: fuelCost(road.km, spec.fuelPer100Km, loadRatio),
    tolls: roadToll(road, spec.tollClass),
  };
}

/**
 * Plan 3.6: ödeme = taban + km × (km fiyatı + ton × ton-km fiyatı) × aciliyet × talep.
 * Tam liraya yuvarlanır.
 */
export function jobPay(km: number, cargo: CargoType, tons: number, demand: number): Money {
  const perKm = cargo.ratePerKm + tons * cargo.ratePerTonKm;
  const raw = BALANCE.jobBasePay + km * perKm * cargo.urgency * demand;
  return Math.round(raw / 100) * 100;
}

/** Teslim anına göre gecikme cezası; saat başı, üst sınırlı, tam liraya yuvarlı. */
export function latePenalty(job: Job, deliveredAt: number): Money {
  const lateMinutes = deliveredAt - job.deadline;
  if (lateMinutes <= 0) return 0;
  const hours = Math.ceil(lateMinutes / MINUTES_PER_HOUR);
  const raw = Math.min(
    job.pay * BALANCE.penaltyPerHourShare * hours,
    job.pay * BALANCE.maxPenaltyShare,
  );
  return Math.round(raw / 100) * 100;
}

export interface JobEstimate {
  /** Kamyonun bulunduğu yerden yükleme şehrine boş gidiş, km. */
  emptyKm: number;
  km: number;
  fuel: Money;
  tolls: Money;
  /** Boş gidiş + yükleme + yolculuk + boşaltma sonrası tahmini teslim anı. */
  eta: number;
  penalty: Money;
  profit: Money;
}

/**
 * Yük borsasında gösterilen tahmini kâr. Araç `cityId` şehrinde boşta
 * kabul ederse ne olacağını hesaplar. Rota yoksa `null`. Uygunluk (kasa,
 * kapasite) burada denetlenmez; bkz. sim.ts `canAccept`.
 */
export function estimateJob(
  world: WorldDef,
  spec: TruckSpec,
  cityId: string,
  job: Job,
  now: number,
): JobEstimate | null {
  const empty = findRoute(world, cityId, job.from);
  const loaded = findRoute(world, job.from, job.to);
  if (!empty || !loaded) return null;
  const load = spec.capacityTons > 0 ? Math.min(job.tons / spec.capacityTons, 1) : 1;
  const fuel =
    fuelCost(empty.km, spec.fuelPer100Km, 0) + fuelCost(loaded.km, spec.fuelPer100Km, load);
  const tolls =
    motorwayToll(empty.motorwayKm, spec.tollClass) +
    motorwayToll(loaded.motorwayKm, spec.tollClass);
  const eta =
    now +
    (empty.minutes + loaded.minutes) / spec.speedFactor +
    BALANCE.loadingMinutes +
    BALANCE.unloadingMinutes;
  const penalty = latePenalty(job, eta);
  return {
    emptyKm: empty.km,
    km: loaded.km,
    fuel,
    tolls,
    eta,
    penalty,
    profit: job.pay - penalty - fuel - tolls,
  };
}

/**
 * Aktif işin kalan km'si ve tahmini teslim anı (sürüş + kalan yükleme/boşaltma).
 * Kamyon boştaysa `null`.
 */
export function tripProgress(
  world: WorldDef,
  truck: Truck,
  now: number,
  speedFactor = 1,
): { km: number; eta: number } | null {
  const trip = truck.trip;
  if (!trip) return null;
  let km = 0;
  let minutes = 0;
  if (trip.phase === 'toPickup' || trip.phase === 'toDelivery') {
    for (let i = trip.leg; i < trip.route.length - 1; i++) {
      const road = roadBetween(world, trip.route[i]!, trip.route[i + 1]!)!;
      const left = i === trip.leg ? road.km - trip.legKm : road.km;
      km += left;
      minutes += roadMinutes({ ...road, km: left }, speedFactor);
    }
  } else {
    minutes += Math.max(trip.waitUntil - now, 0);
  }
  if (trip.phase === 'toPickup' || trip.phase === 'loading') {
    const loaded = findRoute(world, trip.job.from, trip.job.to);
    km += loaded?.km ?? 0;
    minutes += (loaded?.minutes ?? 0) / speedFactor;
  }
  if (trip.phase === 'toPickup') minutes += BALANCE.loadingMinutes;
  if (trip.phase !== 'unloading') minutes += BALANCE.unloadingMinutes;
  return { km, eta: now + minutes };
}
