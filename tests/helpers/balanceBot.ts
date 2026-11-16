import { BALANCE, MINUTES_PER_DAY } from '../../src/core/balance';
import { serviceQuote } from '../../src/core/fleet';
import { applyCommand, createInitialState, step } from '../../src/core/sim';
import type { BodyKind, SimEvent } from '../../src/core/types';
import { getVehicleModel, newTruckPrice, TRAILER_PRICES } from '../../src/data/vehicles';

export interface BotResult {
  /** Günlük net: navlun − yakıt − geçiş − ceza − bakım (şoför maaşı hariç), ₺. */
  netPerDay: number;
  /** Boşta geçen sürenin oranı, 0–1. */
  idleShare: number;
  kmPerDay: number;
  /** Yüklü gidilen km'nin toplam km'ye oranı, 0–1. */
  loadedShare: number;
  /** Yüklü km'lerde ortalama doluluk (yük / kapasite), 0–1. */
  loadFactor: number;
  jobsPerDay: number;
  /** Araç (+ dorse) sıfır fiyatı, ₺. */
  price: number;
  /** Sınıfın taban şoför maaşı düşüldükten sonra aracın kendini ödeme süresi, gün. */
  paybackDays: number;
}

/**
 * Denge botu: tek bir aracı filo müdürünün kurallarıyla `days` gün çalıştırır ve
 * günlük kazancını ölçer. Araç sınıfları arasındaki ilerlemeyi (plan 3.2, 7)
 * sayıyla görmek ve `balance.test.ts` ile korumak için.
 */
export function runBot(modelId: string, body: BodyKind, seed: number, days: number): BotResult {
  const state = createInitialState(seed);
  const model = getVehicleModel(modelId);
  const truck = state.trucks[0]!;
  truck.modelId = modelId;
  truck.body = model.tractor ? null : body;
  truck.condition = 100;
  truck.odometerKm = 0;
  truck.builtAt = 0;
  if (model.tractor) {
    state.trailers.push({
      id: 'r-bot',
      kind: body,
      cityId: truck.cityId,
      truckId: truck.id,
      builtAt: 0,
    });
    truck.trailerId = 'r-bot';
  }
  state.drivers[0]!.license = 'CE';
  state.money = 1_000_000_000;
  const events: SimEvent[] = [];
  applyCommand(state, { type: 'hireManager' }, events);
  const start = state.money;
  const minutes = days * MINUTES_PER_DAY;
  let idle = 0;
  let loadedKm = 0;
  let tonKm = 0;
  for (let i = 0; i < minutes; i++) {
    const before = truck.odometerKm;
    const hauling = truck.trip?.phase === 'toDelivery' ? truck.trip.job.tons : null;
    step(state, events);
    if (hauling !== null) {
      loadedKm += truck.odometerKm - before;
      tonKm += (truck.odometerKm - before) * hauling;
    }
    if (!truck.trip && truck.serviceUntil === null) idle++;
  }
  const managerPay = Math.round(BALANCE.managerSalary / BALANCE.daysPerMonth) * days;
  // Henüz yapılmamış bakım da gider sayılır; yoksa kısa koşularda aşınma bedava görünür.
  const net = state.money - start + managerPay - serviceQuote(truck).cost;
  const netPerDay = net / days / 100;
  const price =
    (newTruckPrice(model, truck.body) + (model.tractor ? TRAILER_PRICES[body] : 0)) / 100;
  const salaryPerDay = BALANCE.driverBaseSalary[model.license] / BALANCE.daysPerMonth / 100;
  return {
    netPerDay,
    idleShare: idle / minutes,
    kmPerDay: truck.odometerKm / days,
    loadedShare: loadedKm / Math.max(truck.odometerKm, 1),
    loadFactor: tonKm / Math.max(loadedKm, 1) / model.capacityTons,
    jobsPerDay: events.filter((e) => e.code.startsWith('job.delivered')).length / days,
    price,
    paybackDays: price / (netPerDay - salaryPerDay),
  };
}

/** Birkaç tohumun ortalaması. */
export function averageBot(
  modelId: string,
  body: BodyKind,
  seeds: number[],
  days: number,
): BotResult {
  const runs = seeds.map((seed) => runBot(modelId, body, seed, days));
  const avg = (pick: (r: BotResult) => number) =>
    runs.reduce((sum, r) => sum + pick(r), 0) / runs.length;
  const netPerDay = avg((r) => r.netPerDay);
  const price = runs[0]!.price;
  const salaryPerDay =
    BALANCE.driverBaseSalary[getVehicleModel(modelId).license] / BALANCE.daysPerMonth / 100;
  return {
    netPerDay,
    idleShare: avg((r) => r.idleShare),
    kmPerDay: avg((r) => r.kmPerDay),
    loadedShare: avg((r) => r.loadedShare),
    loadFactor: avg((r) => r.loadFactor),
    jobsPerDay: avg((r) => r.jobsPerDay),
    price,
    paybackDays: price / (netPerDay - salaryPerDay),
  };
}
