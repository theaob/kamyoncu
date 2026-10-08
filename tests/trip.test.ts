import { describe, expect, it } from 'vitest';
import { BALANCE, MINUTES_PER_DAY } from '../src/core/balance';
import { estimateJob } from '../src/core/economy';
import { applyCommand, book, createInitialState, step } from '../src/core/sim';
import type { GameState, Job, SimEvent } from '../src/core/types';
import { getVehicleModel } from '../src/data/vehicles';
import { getWorld } from '../src/data/worlds';

const world = getWorld('tr');
const van = getVehicleModel('van-used');

function withJob(job: Partial<Job>): GameState {
  const s = createInitialState(1);
  s.jobs = [
    {
      id: 'x',
      from: 'ist',
      to: 'ank',
      cargo: 'parcels',
      tons: 1,
      km: 450,
      pay: 1_000_000,
      deadline: 2 * MINUTES_PER_DAY,
      expiresAt: MINUTES_PER_DAY,
      ...job,
    },
  ];
  return s;
}

function runUntil(
  s: GameState,
  events: SimEvent[],
  done: () => boolean,
  limit = 5 * MINUTES_PER_DAY,
) {
  for (let i = 0; i < limit && !done(); i++) step(s, events, world);
}

describe('sefer döngüsü', () => {
  it('kabul → yükle → yol → teslim → ödeme; tahminle tutarlı', () => {
    const s = withJob({});
    const est = estimateJob(world, van, 'ist', s.jobs[0]!, 0)!;
    const money0 = s.money;
    const events: SimEvent[] = [];
    applyCommand(s, { type: 'acceptJob', jobId: 'x', truckId: 't1' }, events, world);
    const truck = s.trucks[0]!;
    expect(truck.trip?.phase).toBe('loading'); // yük bulunduğu şehirde
    expect(s.jobs.find((j) => j.id === 'x')).toBeUndefined();

    runUntil(s, events, () => truck.trip === null);
    const codes = events.map((e) => e.code).filter((c) => c !== 'time.newDay');
    expect(codes).toEqual(['job.accepted', 'job.loaded', 'job.delivered']);
    expect(truck.cityId).toBe('ank');
    expect(s.money - money0).toBe(est.profit);
    expect(s.finance.totals.freight).toBe(1_000_000);
    expect(s.finance.totals.fuel).toBe(-est.fuel);
    expect(s.finance.totals.tolls).toBe(-est.tolls);
    expect(s.finance.deliveries).toBe(1);
    // Teslim anı tahmine yakın (dakikalık adım yuvarlaması kadar fark).
    expect(Math.abs(s.time - est.eta)).toBeLessThanOrEqual(3);
  });

  it('uzaktaki yük için önce boş gider', () => {
    const s = withJob({ from: 'koc', to: 'ank', km: 340 });
    const events: SimEvent[] = [];
    applyCommand(s, { type: 'acceptJob', jobId: 'x', truckId: 't1' }, events, world);
    const truck = s.trucks[0]!;
    expect(truck.trip?.phase).toBe('toPickup');
    runUntil(s, events, () => truck.trip?.phase === 'loading');
    expect(truck.cityId).toBe('koc');
  });

  it('geç teslimde ceza kesilir', () => {
    const s = withJob({ deadline: 60 });
    const events: SimEvent[] = [];
    applyCommand(s, { type: 'acceptJob', jobId: 'x', truckId: 't1' }, events, world);
    runUntil(s, events, () => s.trucks[0]!.trip === null);
    const late = events.find((e) => e.code === 'job.deliveredLate');
    expect(late).toBeDefined();
    expect(s.finance.totals.penalties).toBeLessThan(0);
    expect(s.finance.lateDeliveries).toBe(1);
  });

  it('meşgul kamyon ve ağır yük reddedilir', () => {
    const s = withJob({ tons: van.capacityTons + 1 });
    const events: SimEvent[] = [];
    applyCommand(s, { type: 'acceptJob', jobId: 'x', truckId: 't1' }, events, world);
    expect(events).toEqual([{ code: 'job.rejected', params: { reason: 'tooHeavy' } }]);

    const busy = withJob({});
    busy.jobs.push({ ...busy.jobs[0]!, id: 'y' });
    applyCommand(busy, { type: 'acceptJob', jobId: 'x', truckId: 't1' }, [], world);
    const ev: SimEvent[] = [];
    applyCommand(busy, { type: 'acceptJob', jobId: 'y', truckId: 't1' }, ev, world);
    expect(ev).toEqual([{ code: 'job.rejected', params: { reason: 'truckBusy' } }]);
  });

  it('finans dökümü sınırlı gün tutar', () => {
    const s = createInitialState(1);
    for (let d = 0; d < BALANCE.ledgerDays + 10; d++) {
      s.time = d * MINUTES_PER_DAY;
      book(s, 'fuel', -100);
    }
    expect(s.finance.days.length).toBe(BALANCE.ledgerDays);
  });
});

describe('denge duman testi', () => {
  it('başlangıç parası panodaki her ilk işin giderini karşılar, fazlasını değil', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = createInitialState(seed);
      const truck = s.trucks[0]!;
      for (const job of s.jobs) {
        const e = estimateJob(world, van, truck.cityId, job, s.time)!;
        expect(e.fuel + e.tolls, `${seed}:${job.id}`).toBeLessThan(BALANCE.startingMoney);
      }
    }
    // Kariyer başı sermaye birkaç uzun seferlik yakıttan ibaret kalmalı.
    expect(BALANCE.startingMoney).toBeLessThanOrEqual(50_000 * 100);
  });

  it('açgözlü bot 20 günde kâr eder (Faz 1 başarı ölçütünün kaba vekili)', () => {
    const s = createInitialState(2026);
    const truck = s.trucks[0]!;
    for (let minute = 0; minute < 20 * MINUTES_PER_DAY; minute++) {
      if (!truck.trip) {
        const best = s.jobs
          .filter((j) => j.tons <= van.capacityTons)
          .map((j) => ({ j, e: estimateJob(world, van, truck.cityId, j, s.time)! }))
          .sort((a, b) => b.e.profit - a.e.profit)[0];
        if (best && best.e.profit > 0) {
          applyCommand(s, { type: 'acceptJob', jobId: best.j.id, truckId: truck.id }, [], world);
        }
      }
      step(s, [], world);
    }
    expect(s.finance.deliveries).toBeGreaterThan(10);
    expect(s.money).toBeGreaterThan(BALANCE.startingMoney);
  });
});
