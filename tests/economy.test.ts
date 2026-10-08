import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/core/balance';
import { estimateJob, fuelLiters, jobPay, latePenalty, tripProgress } from '../src/core/economy';
import { applyCommand, createInitialState } from '../src/core/sim';
import type { Job } from '../src/core/types';
import { getCargo } from '../src/data/cargo';
import { getVehicleModel } from '../src/data/vehicles';
import { getWorld } from '../src/data/worlds';

const van = getVehicleModel('van-used');
const job: Job = {
  id: 'j1',
  from: 'ist',
  to: 'ank',
  cargo: 'parcels',
  tons: 1,
  km: 450,
  pay: 900_000,
  deadline: 600,
  expiresAt: 300,
};

describe('ekonomi', () => {
  it('yakıt yükle artar (plan 3.6)', () => {
    expect(fuelLiters(100, van, 0)).toBeCloseTo(van.fuelPer100Km);
    expect(fuelLiters(100, van, 1)).toBeCloseTo(van.fuelPer100Km * (1 + BALANCE.fuelLoadFactor));
  });

  it('ödeme tam lira, mesafe ve talep ile artar', () => {
    const cargo = getCargo('parcels');
    const a = jobPay(300, cargo, 1);
    expect(a % 100).toBe(0);
    expect(jobPay(600, cargo, 1)).toBeGreaterThan(a);
    expect(jobPay(300, cargo, 1.2)).toBeGreaterThan(a);
  });

  it('gecikme cezası saat başı artar ve tavanı vardır', () => {
    expect(latePenalty(job, 600)).toBe(0);
    expect(latePenalty(job, 601)).toBe(
      Math.round((job.pay * BALANCE.penaltyPerHourShare) / 100) * 100,
    );
    expect(latePenalty(job, 600 + 60 * 1000)).toBe(job.pay * BALANCE.maxPenaltyShare);
  });

  it('tahmin: yük buradaysa boş gidiş yok; uzaktaysa var ve kâr düşer', () => {
    const world = getWorld('tr');
    const here = estimateJob(world, van, 'ist', job, 0)!;
    expect(here.emptyKm).toBe(0);
    expect(here.km).toBe(450);
    expect(here.profit).toBe(job.pay - here.fuel - here.tolls - here.penalty);
    const far = estimateJob(world, van, 'izm', job, 0)!;
    expect(far.emptyKm).toBeGreaterThan(0);
    expect(far.profit).toBeLessThan(here.profit);
  });
});

describe('aktif sefer ilerlemesi', () => {
  it('boşta null; yeni kabul edilen işte tahmini teslim anı ile aynı', () => {
    const world = getWorld('tr');
    const s = createInitialState(4);
    const truck = s.trucks[0]!;
    expect(tripProgress(world, truck, s.time)).toBeNull();
    const job = s.jobs[0]!;
    const est = estimateJob(world, van, truck.cityId, job, s.time)!;
    applyCommand(s, { type: 'acceptJob', jobId: job.id, truckId: truck.id }, [], world);
    const p = tripProgress(world, truck, s.time)!;
    expect(p.km).toBeCloseTo(est.emptyKm + est.km);
    expect(p.eta).toBeCloseTo(est.eta);
  });
});
