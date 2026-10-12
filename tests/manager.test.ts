import { describe, expect, it } from 'vitest';
import { BALANCE, MINUTES_PER_DAY } from '../src/core/balance';
import { estimateJob } from '../src/core/economy';
import { monthlyPayroll, truckSpec } from '../src/core/fleet';
import { planManager } from '../src/core/manager';
import { SimRunner } from '../src/core/runner';
import { deserialize, serialize } from '../src/core/save';
import { applyCommand, canAccept, createInitialState, SAVE_VERSION, step } from '../src/core/sim';
import type { Command, GameState, SimEvent } from '../src/core/types';
import { getWorld } from '../src/data/worlds';

const world = getWorld('tr');
const TL = 100;

function run(s: GameState, command: Command): SimEvent[] {
  const events: SimEvent[] = [];
  applyCommand(s, command, events, world);
  return events;
}

const plan = (s: GameState) => planManager(s, world, (j, t) => canAccept(s, world, j, t));

describe('filo müdürü', () => {
  it('işe alınınca boştaki aracı zamanında yetişen kârlı bir işe yollar', () => {
    const s = createInitialState(3);
    const truck = s.trucks[0]!;
    const before = plan({ ...s, manager: { name: 'x', salary: 0, active: true } });
    expect(before.dispatch).toHaveLength(1);
    const { jobId } = before.dispatch[0]!;
    const job = s.jobs.find((j) => j.id === jobId)!;
    const est = estimateJob(world, truckSpec(s, truck), truck.cityId, job, s.time)!;
    expect(est.penalty).toBe(0);
    expect(est.profit).toBeGreaterThanOrEqual(BALANCE.managerMinProfit);

    const events = run(s, { type: 'hireManager' });
    expect(s.manager).toMatchObject({ salary: BALANCE.managerSalary, active: true });
    expect(events.map((e) => e.code)).toEqual(['manager.hired', 'manager.dispatched']);
    expect(truck.trip?.job.id).toBe(jobId);
    expect(s.jobs.some((j) => j.id === jobId)).toBe(false);
  });

  it('ikinci müdür alınamaz; çıkarılınca maaş biter', () => {
    const s = createInitialState(3);
    run(s, { type: 'hireManager' });
    expect(run(s, { type: 'hireManager' })).toEqual([
      { code: 'command.failed', params: { reason: 'hasManager' } },
    ]);
    expect(monthlyPayroll(s)).toBe(BALANCE.managerSalary);
    run(s, { type: 'fireManager' });
    expect(s.manager).toBeNull();
    expect(monthlyPayroll(s)).toBe(0);
  });

  it('maaşı günlük ödenir', () => {
    const s = createInitialState(3);
    run(s, { type: 'setTruckManaged', truckId: 't1', managed: false });
    run(s, { type: 'hireManager' });
    const money = s.money;
    for (let i = 0; i < MINUTES_PER_DAY; i++) step(s, [], world);
    expect(money - s.money).toBe(Math.round(BALANCE.managerSalary / BALANCE.daysPerMonth));
  });

  it('işareti kaldırılan araca ve görev dışıyken dokunmaz', () => {
    const s = createInitialState(3);
    run(s, { type: 'setTruckManaged', truckId: 't1', managed: false });
    run(s, { type: 'hireManager' });
    for (let i = 0; i < 120; i++) step(s, [], world);
    expect(s.trucks[0]!.trip).toBeNull();

    run(s, { type: 'setManagerActive', active: false });
    run(s, { type: 'setTruckManaged', truckId: 't1', managed: true });
    for (let i = 0; i < 120; i++) step(s, [], world);
    expect(s.trucks[0]!.trip).toBeNull();

    const events = run(s, { type: 'setManagerActive', active: true });
    expect(events.map((e) => e.code)).toContain('manager.dispatched');
    expect(s.trucks[0]!.trip).not.toBeNull();
  });

  it('yıpranan aracı bakıma yollar', () => {
    const s = createInitialState(3);
    s.trucks[0]!.condition = BALANCE.managerServiceBelow - 1;
    const events = run(s, { type: 'hireManager' });
    expect(events.map((e) => e.code)).toEqual(['manager.hired', 'manager.serviced']);
    expect(s.trucks[0]!.serviceUntil).not.toBeNull();
    expect(s.trucks[0]!.trip).toBeNull();
  });

  it('kasa yedeğinin altına inecek işe girmez', () => {
    const s = createInitialState(3);
    s.money = BALANCE.managerCashReserve;
    run(s, { type: 'hireManager' });
    expect(s.trucks[0]!.trip).toBeNull();
  });

  it('aynı işi iki araca vermez', () => {
    const s = createInitialState(5);
    s.money = 10_000_000 * TL;
    run(s, { type: 'buyNewTruck', modelId: 'c1-standard', body: 'tenteli', cityId: 'ist' });
    run(s, { type: 'buyNewTruck', modelId: 'c1-standard', body: 'tenteli', cityId: 'ist' });
    s.drivers.push(
      { id: 'dA', name: 'A', license: 'C1', level: 1, salary: 0, isPlayer: false },
      { id: 'dB', name: 'B', license: 'C1', level: 1, salary: 0, isPlayer: false },
    );
    s.trucks[1]!.driverId = 'dA';
    s.trucks[2]!.driverId = 'dB';
    run(s, { type: 'hireManager' });
    const jobs = s.trucks.flatMap((t) => (t.trip ? [t.trip.job.id] : []));
    expect(jobs.length).toBeGreaterThan(1);
    expect(new Set(jobs).size).toBe(jobs.length);
  });

  it('şoförsüz araca iş vermez', () => {
    const s = createInitialState(3);
    s.trucks[0]!.driverId = null;
    run(s, { type: 'hireManager' });
    expect(s.trucks[0]!.trip).toBeNull();
  });

  it('yönettiği araçlar oyunu duraklatmadan günlerce kendi başına çalışır', () => {
    const s = createInitialState(7);
    run(s, { type: 'hireManager' });
    const r = new SimRunner(s);
    r.autoPause = true;
    r.apply({ type: 'setSpeed', speed: 64 });
    const events: SimEvent[] = [];
    for (let i = 0; i < 5 * 24 * 60 && !s.paused; i++) events.push(...r.advance(16));
    expect(s.paused).toBe(false);
    const codes = events.map((e) => e.code);
    expect(codes).not.toContain('time.autoPaused');
    expect(s.finance.deliveries).toBeGreaterThanOrEqual(2);
    expect(codes.filter((c) => c === 'manager.dispatched').length).toBeGreaterThanOrEqual(2);
  });

  it('elle yönetilen aracın teslimatı oyunu yine duraklatır', () => {
    const s = createInitialState(7);
    run(s, { type: 'setTruckManaged', truckId: 't1', managed: false });
    run(s, { type: 'hireManager' });
    const job = s.jobs.find((j) => !canAccept(s, world, j.id, 't1'))!;
    run(s, { type: 'acceptJob', jobId: job.id, truckId: 't1' });
    expect(s.trucks[0]!.trip).not.toBeNull();
    const r = new SimRunner(s);
    r.autoPause = true;
    r.apply({ type: 'setSpeed', speed: 64 });
    for (let i = 0; i < 20_000 && !s.paused; i++) r.advance(16);
    expect(s.paused).toBe(true);
    expect(s.finance.deliveries).toBe(1);
  });

  it('kaydedilip yüklenir; sürüm 3 kaydı müdürsüz göç eder', () => {
    const s = createInitialState(3);
    run(s, { type: 'hireManager' });
    expect(deserialize(serialize(s))).toEqual({ ...s, paused: true });

    const v3 = JSON.parse(serialize(createInitialState(3))) as Record<string, unknown>;
    v3.version = 3;
    delete v3.manager;
    for (const t of v3.trucks as Record<string, unknown>[]) delete t.managed;
    const loaded = deserialize(JSON.stringify(v3));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.manager).toBeNull();
    expect(loaded.trucks.every((t) => t.managed)).toBe(true);
  });
});
