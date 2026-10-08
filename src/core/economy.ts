import { BALANCE, MINUTES_PER_HOUR } from './balance';
import { findRoute, roadToll } from './routing';
import type { CargoType, Job, Money, Road, VehicleModel, WorldDef } from './types';

/** Plan 3.6: yakıt_L = mesafe_km / 100 × tüketim × (1 + 0,35 × yük_oranı). */
export function fuelLiters(km: number, model: VehicleModel, loadRatio: number): number {
  return (km / 100) * model.fuelPer100Km * (1 + BALANCE.fuelLoadFactor * loadRatio);
}

export function fuelCost(km: number, model: VehicleModel, loadRatio: number): Money {
  return Math.round(fuelLiters(km, model, loadRatio) * BALANCE.dieselPerLiter);
}

/** Bir yolun yakıt + geçiş ücreti. */
export function legCost(road: Road, model: VehicleModel, loadRatio: number) {
  return {
    fuel: fuelCost(road.km, model, loadRatio),
    tolls: roadToll(road),
  };
}

/**
 * Plan 3.6: ödeme = taban + km × birim_fiyat × aciliyet × talep.
 * Tam liraya yuvarlanır.
 */
export function jobPay(km: number, cargo: CargoType, demand: number): Money {
  const raw = BALANCE.jobBasePay + km * cargo.ratePerKm * cargo.urgency * demand;
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
 * Yük borsasında gösterilen tahmini kâr. Kamyon `cityId` şehrinde boşta
 * kabul ederse ne olacağını hesaplar. Rota yoksa `null`.
 */
export function estimateJob(
  world: WorldDef,
  model: VehicleModel,
  cityId: string,
  job: Job,
  now: number,
): JobEstimate | null {
  const empty = findRoute(world, cityId, job.from);
  const loaded = findRoute(world, job.from, job.to);
  if (!empty || !loaded) return null;
  const load = job.tons / model.capacityTons;
  const fuel = fuelCost(empty.km, model, 0) + fuelCost(loaded.km, model, load);
  const tolls = empty.tolls + loaded.tolls;
  const eta =
    now + empty.minutes + BALANCE.loadingMinutes + loaded.minutes + BALANCE.unloadingMinutes;
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
