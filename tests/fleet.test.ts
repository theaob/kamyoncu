import { describe, expect, it } from 'vitest';
import { BALANCE, MINUTES_PER_DAY } from '../src/core/balance';
import { serviceQuote, truckValue } from '../src/core/fleet';
import { deserialize } from '../src/core/save';
import { applyCommand, canAccept, createInitialState, SAVE_VERSION, step } from '../src/core/sim';
import {
  BODY_KINDS,
  type Candidate,
  type GameState,
  type Job,
  type SimEvent,
} from '../src/core/types';
import {
  getVehicleModel,
  newTruckPrice,
  TRAILER_PRICES,
  VEHICLE_MODELS,
} from '../src/data/vehicles';
import { getWorld } from '../src/data/worlds';
import { drawTruck } from '../src/ui/truckArt';

const world = getWorld('tr');
const TL = 100;

function rich(seed = 1): GameState {
  const s = createInitialState(seed);
  s.money = 50_000_000 * TL;
  return s;
}

function run(s: GameState, command: Parameters<typeof applyCommand>[1]): SimEvent[] {
  const events: SimEvent[] = [];
  applyCommand(s, command, events, world);
  return events;
}

function candidate(s: GameState, license: Candidate['license']): Candidate {
  const c: Candidate = {
    id: `d${s.nextId++}`,
    name: 'Ali Test',
    license,
    level: 1,
    salary: 60_000 * TL,
    isPlayer: false,
    expiresAt: 10_000,
  };
  s.candidates.push(c);
  return c;
}

function job(s: GameState, fields: Partial<Job>): Job {
  const j: Job = {
    id: `j${s.nextId++}`,
    from: 'ist',
    to: 'ank',
    cargo: 'fuel',
    body: 'tanker',
    tons: 20,
    km: 450,
    pay: 3_000_000,
    deadline: 3 * MINUTES_PER_DAY,
    expiresAt: MINUTES_PER_DAY,
    ...fields,
  };
  s.jobs.push(j);
  return j;
}

describe('başlangıç filosu', () => {
  it('oyuncu kendi kamyonetini sürer; pazar ve adaylar dolu', () => {
    const s = createInitialState(1);
    expect(s.trucks).toHaveLength(1);
    const truck = s.trucks[0]!;
    expect(truck).toMatchObject({ plate: '34 KMY 01', driverId: 'p0', body: 'tenteli' });
    expect(s.drivers).toEqual([expect.objectContaining({ id: 'p0', isPlayer: true, salary: 0 })]);
    expect(s.candidates).toHaveLength(BALANCE.candidatesCount);
    expect(s.usedListings).toHaveLength(BALANCE.usedListingsCount);
    for (const l of s.usedListings) {
      expect(l.price).toBeGreaterThan(0);
      expect(l.body === null).toBe(getVehicleModel(l.modelId).tractor);
    }
  });
});

describe('araç alım-satımı', () => {
  it('parası yetmeyen alım reddedilir, durum değişmez', () => {
    const s = createInitialState(1);
    const before = JSON.stringify(s);
    const ev = run(s, {
      type: 'buyNewTruck',
      modelId: 'c3-standard',
      body: 'tenteli',
      cityId: 'ist',
    });
    expect(ev).toEqual([{ code: 'command.failed', params: { reason: 'noMoney' } }]);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('sıfır kamyon: frigorifik kasa daha pahalı; para araç kalemine yazılır, net kâra değil', () => {
    const s = rich();
    const m = getVehicleModel('c2-premium');
    expect(newTruckPrice(m, 'frigorifik')).toBeGreaterThan(newTruckPrice(m, 'tenteli'));
    const money = s.money;
    const ev = run(s, { type: 'buyNewTruck', modelId: m.id, body: 'frigorifik', cityId: 'izm' });
    expect(ev[0]).toMatchObject({ code: 'fleet.bought', params: { plate: '34 KMY 02' } });
    const truck = s.trucks[1]!;
    expect(truck).toMatchObject({ cityId: 'izm', condition: 100, odometerKm: 0, driverId: null });
    expect(money - s.money).toBe(newTruckPrice(m, 'frigorifik'));
    expect(s.finance.totals.vehicles).toBe(s.money - money);
  });

  it('kamyona tanker kasa takılamaz; çekiciye kasa seçilmez', () => {
    const s = rich();
    expect(
      run(s, { type: 'buyNewTruck', modelId: 'c3-economy', body: 'tanker', cityId: 'ist' }),
    ).toEqual([{ code: 'command.failed', params: { reason: 'noRigidBody' } }]);
    run(s, { type: 'buyNewTruck', modelId: 'c6-standard', body: 'tenteli', cityId: 'ist' });
    expect(s.trucks[1]!.body).toBeNull();
  });

  it('ikinci el ilan alınır ve listeden düşer', () => {
    const s = rich();
    const listing = s.usedListings[0]!;
    run(s, { type: 'buyUsedTruck', listingId: listing.id });
    expect(s.usedListings.find((l) => l.id === listing.id)).toBeUndefined();
    expect(s.trucks[1]).toMatchObject({
      modelId: listing.modelId,
      cityId: listing.cityId,
      condition: listing.condition,
    });
  });

  it('son araç satılamaz; satış değeri yaş ve kilometreyle düşer', () => {
    const s = rich();
    expect(run(s, { type: 'sellTruck', truckId: 't1' })).toEqual([
      { code: 'command.failed', params: { reason: 'lastTruck' } },
    ]);
    run(s, { type: 'buyNewTruck', modelId: 'c1-standard', body: 'tenteli', cityId: 'ist' });
    const fresh = s.trucks[1]!;
    const old = s.trucks[0]!;
    expect(truckValue(fresh, s.time)).toBeLessThan(getVehicleModel('c1-standard').price);
    expect(truckValue(old, s.time)).toBeLessThan(truckValue(fresh, s.time));
    const money = s.money;
    run(s, { type: 'sellTruck', truckId: old.id });
    expect(s.trucks.map((t) => t.id)).toEqual([fresh.id]);
    expect(s.money - money).toBe(truckValue(old, s.time));
  });
});

describe('şoförler', () => {
  it('işe alım, ehliyet denetimi, maaş ve işten çıkarma', () => {
    const s = rich();
    run(s, { type: 'buyNewTruck', modelId: 'c3-standard', body: 'tenteli', cityId: 'ist' });
    const truck = s.trucks[1]!;
    const j = job(s, { cargo: 'textiles', body: 'tenteli', tons: 8 });
    expect(canAccept(s, world, j.id, truck.id)).toBe('noDriver');

    const c1 = candidate(s, 'C1');
    run(s, { type: 'hireDriver', candidateId: c1.id });
    expect(run(s, { type: 'assignDriver', driverId: c1.id, truckId: truck.id })).toEqual([
      { code: 'command.failed', params: { reason: 'license' } },
    ]);
    const c = candidate(s, 'C');
    const hired = run(s, { type: 'hireDriver', candidateId: c.id });
    expect(hired).toEqual([{ code: 'driver.hired', params: { name: 'Ali Test' } }]);
    expect(s.candidates.find((x) => x.id === c.id)).toBeUndefined();
    run(s, { type: 'assignDriver', driverId: c.id, truckId: truck.id });
    expect(canAccept(s, world, j.id, truck.id)).toBeNull();

    // Maaşlar her gün 1/30 olarak ödenir.
    for (let i = 0; i < MINUTES_PER_DAY; i++) step(s, [], world);
    expect(s.finance.totals.salaries).toBe(-Math.round((2 * 60_000 * TL) / BALANCE.daysPerMonth));

    expect(run(s, { type: 'fireDriver', driverId: 'p0' })).toEqual([
      { code: 'command.failed', params: { reason: 'isPlayer' } },
    ]);
    run(s, { type: 'fireDriver', driverId: c.id });
    expect(truck.driverId).toBeNull();
  });

  it('pazar ve adaylar haftada bir yenilenir', () => {
    const s = createInitialState(1);
    const first = s.candidates;
    const events: SimEvent[] = [];
    for (let i = 0; i < BALANCE.marketRefreshDays * MINUTES_PER_DAY; i++) step(s, events, world);
    expect(events.filter((e) => e.code === 'market.refreshed')).toHaveLength(1);
    expect(s.candidates).not.toBe(first);
    expect(s.candidates).toHaveLength(BALANCE.candidatesCount);
  });
});

describe('tır ve dorseler', () => {
  it('çekici dorsesiz iş alamaz; doğru dorse takılınca alır ve taşır', () => {
    const s = rich();
    run(s, { type: 'buyNewTruck', modelId: 'c6-premium', body: null, cityId: 'ist' });
    const tir = s.trucks[1]!;
    const ce = candidate(s, 'CE');
    run(s, { type: 'hireDriver', candidateId: ce.id });
    run(s, { type: 'assignDriver', driverId: ce.id, truckId: tir.id });
    const tankJob = job(s, {});
    const boxJob = job(s, { cargo: 'grain', body: 'tenteli', tons: 20 });
    expect(canAccept(s, world, tankJob.id, tir.id)).toBe('noTrailer');

    run(s, { type: 'buyTrailer', kind: 'tanker', cityId: 'ank' });
    const trailer = s.trailers[0]!;
    expect(s.finance.totals.vehicles).toBeLessThan(0);
    expect(run(s, { type: 'attachTrailer', truckId: tir.id, trailerId: trailer.id })).toEqual([
      { code: 'command.failed', params: { reason: 'differentCity' } },
    ]);
    trailer.cityId = 'ist';
    expect(run(s, { type: 'attachTrailer', truckId: 't1', trailerId: trailer.id })).toEqual([
      { code: 'command.failed', params: { reason: 'notTractor' } },
    ]);
    run(s, { type: 'attachTrailer', truckId: tir.id, trailerId: trailer.id });
    expect(canAccept(s, world, boxJob.id, tir.id)).toBe('wrongBody');
    expect(canAccept(s, world, tankJob.id, tir.id)).toBeNull();
    expect(canAccept(s, world, tankJob.id, 't1')).toBe('wrongBody');
    expect(run(s, { type: 'sellTrailer', trailerId: trailer.id })).toEqual([
      { code: 'command.failed', params: { reason: 'trailerInUse' } },
    ]);

    run(s, { type: 'acceptJob', jobId: tankJob.id, truckId: tir.id });
    const events: SimEvent[] = [];
    for (let i = 0; i < 2 * MINUTES_PER_DAY && tir.trip; i++) step(s, events, world);
    expect(events.find((e) => e.code === 'job.delivered')).toMatchObject({
      params: { plate: tir.plate, city: 'ank' },
    });
    // Dorse çekiciyle birlikte gelir.
    expect(trailer.cityId).toBe('ank');
    run(s, { type: 'detachTrailer', truckId: tir.id });
    expect(tir.trailerId).toBeNull();
    const money = s.money;
    run(s, { type: 'sellTrailer', trailerId: trailer.id });
    expect(s.money - money).toBeGreaterThan(0);
    expect(s.money - money).toBeLessThan(TRAILER_PRICES.tanker);
  });
});

describe('durum ve bakım', () => {
  it('araç km ile yıpranır; sınırın altında iş alamaz, bakım düzeltir', () => {
    const s = rich();
    const truck = s.trucks[0]!;
    const j = job(s, { cargo: 'parcels', body: 'tenteli', tons: 1, deadline: 99_999 });
    const startCondition = truck.condition;
    run(s, { type: 'acceptJob', jobId: j.id, truckId: truck.id });
    const events: SimEvent[] = [];
    for (let i = 0; i < MINUTES_PER_DAY && truck.trip; i++) step(s, events, world);
    const model = getVehicleModel(truck.modelId);
    expect(startCondition - truck.condition).toBeCloseTo(450 * model.wearPerKm, 1);

    truck.condition = BALANCE.minConditionForJobs + 0.001;
    const j2 = job(s, { from: 'ank', to: 'ist', cargo: 'parcels', body: 'tenteli', tons: 1 });
    expect(canAccept(s, world, j2.id, truck.id)).toBeNull();
    run(s, { type: 'acceptJob', jobId: j2.id, truckId: truck.id });
    events.length = 0;
    for (let i = 0; i < MINUTES_PER_DAY && truck.trip; i++) step(s, events, world);
    expect(events.filter((e) => e.code === 'fleet.needsService')).toHaveLength(1);
    const j3 = job(s, { from: 'ist', cargo: 'parcels', body: 'tenteli', tons: 1 });
    expect(canAccept(s, world, j3.id, truck.id)).toBe('needsService');

    const quote = serviceQuote(truck);
    const money = s.money;
    run(s, { type: 'serviceTruck', truckId: truck.id });
    expect(money - s.money).toBe(quote.cost);
    expect(s.finance.totals.maintenance).toBe(-quote.cost);
    expect(canAccept(s, world, j3.id, truck.id)).toBe('inService');
    events.length = 0;
    for (let i = 0; i < quote.minutes; i++) step(s, events, world);
    expect(events).toContainEqual({ code: 'fleet.serviceDone', params: { plate: truck.plate } });
    expect(truck.condition).toBe(100);
    expect(run(s, { type: 'serviceTruck', truckId: truck.id })).toEqual([
      { code: 'command.failed', params: { reason: 'notNeeded' } },
    ]);
  });
});

describe('kayıt göçü (Faz 1 → Faz 2)', () => {
  it('sürüm 2 kaydı filo, şoför ve pazarla güncel sürüme taşınır', () => {
    const v2 = {
      version: 2,
      seed: 7,
      rngState: 7,
      time: 3000,
      speed: 2,
      paused: false,
      activeWorldId: 'tr',
      money: 123_456,
      nextId: 50,
      trucks: [{ id: 't1', modelId: 'van-used', cityId: 'ank', odometerKm: 190_000, trip: null }],
      jobs: [
        {
          id: 'j3',
          from: 'ank',
          to: 'ist',
          cargo: 'pharma',
          tons: 1,
          km: 450,
          pay: 900_000,
          deadline: 4000,
          expiresAt: 3500,
        },
      ],
      finance: {
        days: [{ day: 2, amounts: { freight: 10, fuel: -5, tolls: -1, penalties: 0 } }],
        totals: { freight: 10, fuel: -5, tolls: -1, penalties: 0 },
        deliveries: 1,
        lateDeliveries: 0,
      },
    };
    const s = deserialize(JSON.stringify(v2));
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.money).toBe(123_456);
    expect(s.trucks[0]).toMatchObject({
      id: 't1',
      modelId: BALANCE.startingTruck.modelId,
      cityId: 'ank',
      odometerKm: 190_000,
      driverId: 'p0',
      body: 'tenteli',
    });
    expect(s.jobs[0]!.body).toBe('frigorifik');
    expect(s.drivers.map((d) => d.id)).toEqual(['p0']);
    expect(s.candidates.length).toBeGreaterThan(0);
    expect(s.finance.totals.salaries).toBe(0);
    expect(s.finance.days[0]!.amounts.vehicles).toBe(0);
    for (let i = 0; i < 100; i++) step(s, [], world);
  });
});

describe('garaj çizimi', () => {
  it('her model ve kasa için geçerli SVG üretir', () => {
    for (const m of VEHICLE_MODELS) {
      for (const body of m.tractor ? [null, ...BODY_KINDS] : (['tenteli', 'frigorifik'] as const)) {
        const art = drawTruck(m, body);
        expect(art.markup, `${m.id}:${body}`).not.toMatch(/NaN|undefined/);
        expect(art.viewBox.split(' ').map(Number).every(Number.isFinite)).toBe(true);
      }
    }
  });
});
