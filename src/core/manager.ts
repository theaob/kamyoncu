import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import { BALANCE } from './balance';
import { estimateJob } from './economy';
import { serviceQuote, truckSpec } from './fleet';
import type { Rng } from './rng';
import type { AcceptError, GameState, Manager, Money, Truck, WorldDef } from './types';

/**
 * Filo müdürü (oyuncu isteği: araç sayısı artınca tek tek iş vermek yorucu).
 * Kurallar bilerek basit ve öngörülebilir:
 * - Yalnızca boştaki, şoförlü ve "müdür yönetsin" işaretli araçlara bakar.
 * - Durumu `managerServiceBelow` altına düşen aracı önce bakıma yollar.
 * - İşlerden yalnızca zamanında yetişecek ve `managerMinProfit` üstü kâr bırakacak
 *   olanları seçer; saat başı kârı en yüksek araç–iş eşleşmesinden başlayarak dağıtır.
 * - Kasayı `managerCashReserve` altına düşürecek yakıt/bakım harcamasına girmez.
 * Araç alıp satmaz, şoför işe almaz/çıkarmaz.
 */

export function createManager(rng: Rng): Manager {
  const name = `${FIRST_NAMES[rng.int(0, FIRST_NAMES.length - 1)]} ${LAST_NAMES[rng.int(0, LAST_NAMES.length - 1)]}`;
  return { name, salary: BALANCE.managerSalary, active: true };
}

/** Müdür şu an bu aracı yönetiyor mu (müdür var, açık ve araç işaretli). */
export function isManaged(state: Pick<GameState, 'manager'>, truck: Truck): boolean {
  return !!state.manager?.active && truck.managed;
}

export interface Dispatch {
  truckId: string;
  jobId: string;
  profit: Money;
}

export interface ManagerPlan {
  /** Bakıma gidecek araçlar. */
  service: string[];
  /** Verilecek işler; birbirinden bağımsız (her araç ve iş en çok bir kez). */
  dispatch: Dispatch[];
}

type CanAccept = (jobId: string, truckId: string) => AcceptError | null;

/** Müdürün bu an yapacaklarını hesaplar; durumu değiştirmez. */
export function planManager(state: GameState, world: WorldDef, canAccept: CanAccept): ManagerPlan {
  const plan: ManagerPlan = { service: [], dispatch: [] };
  if (!state.manager?.active) return plan;
  let cash = state.money - BALANCE.managerCashReserve;
  const idle = state.trucks.filter(
    (t) => t.managed && t.trip === null && t.serviceUntil === null && t.driverId !== null,
  );
  const free: Truck[] = [];
  for (const truck of idle) {
    if (truck.condition < BALANCE.managerServiceBelow) {
      const { cost, minutes } = serviceQuote(truck);
      if (minutes > 0 && cost <= cash) {
        cash -= cost;
        plan.service.push(truck.id);
        continue;
      }
    }
    // Bakıma parası yetmese de iş sınırının üstündeyse çalışmaya devam eder.
    if (truck.condition >= BALANCE.minConditionForJobs) free.push(truck);
  }

  const options: (Dispatch & { perHour: number; cost: Money })[] = [];
  for (const truck of free) {
    const spec = truckSpec(state, truck);
    for (const job of state.jobs) {
      if (canAccept(job.id, truck.id)) continue;
      const est = estimateJob(world, spec, truck.cityId, job, state.time);
      if (!est || est.penalty > 0 || est.profit < BALANCE.managerMinProfit) continue;
      const hours = Math.max((est.eta - state.time) / 60, 0.5);
      options.push({
        truckId: truck.id,
        jobId: job.id,
        profit: est.profit,
        perHour: est.profit / hours,
        cost: est.fuel + est.tolls,
      });
    }
  }
  // Açgözlü eşleştirme: saat başı kârı en yüksek öneriden başla; eşitlikte kimliğe göre (deterministik).
  options.sort(
    (a, b) =>
      b.perHour - a.perHour || a.truckId.localeCompare(b.truckId) || a.jobId.localeCompare(b.jobId),
  );
  const usedTrucks = new Set<string>();
  const usedJobs = new Set<string>();
  for (const o of options) {
    if (usedTrucks.has(o.truckId) || usedJobs.has(o.jobId) || o.cost > cash) continue;
    usedTrucks.add(o.truckId);
    usedJobs.add(o.jobId);
    cash -= o.cost;
    plan.dispatch.push({ truckId: o.truckId, jobId: o.jobId, profit: o.profit });
  }
  return plan;
}
