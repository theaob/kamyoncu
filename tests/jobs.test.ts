import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/core/balance';
import { refreshJobs } from '../src/core/jobs';
import { Rng } from '../src/core/rng';
import { createInitialState } from '../src/core/sim';
import { CARGO_TYPES } from '../src/data/cargo';
import { VEHICLE_MODELS } from '../src/data/vehicles';
import { getWorld } from '../src/data/worlds';

const world = getWorld('tr');

describe('yük borsası', () => {
  it('başlangıçta her şehirde ilan var ve sınırı aşmıyor', () => {
    const s = createInitialState(42);
    expect(s.jobs.length).toBeGreaterThan(world.cities.length);
    for (const city of world.cities) {
      const n = s.jobs.filter((j) => j.from === city.id).length;
      expect(n, city.id).toBeLessThanOrEqual(city.size * BALANCE.jobsPerCitySize);
    }
  });

  it('ilanlar geçerli: bir araca sığar, kasa yükle uyumlu, süreler tutarlı, kimlikler benzersiz', () => {
    const s = createInitialState(7);
    const cap = Math.max(...VEHICLE_MODELS.map((m) => m.capacityTons));
    const cargoIds = new Set(CARGO_TYPES.map((c) => c.id));
    expect(new Set(s.jobs.map((j) => j.id)).size).toBe(s.jobs.length);
    for (const j of s.jobs) {
      expect(j.from).not.toBe(j.to);
      expect(cargoIds.has(j.cargo)).toBe(true);
      expect(j.body).toBe(CARGO_TYPES.find((c) => c.id === j.cargo)!.body);
      expect(j.tons).toBeLessThanOrEqual(cap);
      expect(j.km).toBeGreaterThanOrEqual(BALANCE.minJobKm);
      expect(j.pay).toBeGreaterThan(0);
      expect(j.deadline).toBeGreaterThan(s.time);
      expect(j.expiresAt).toBeLessThanOrEqual(j.deadline);
    }
  });

  it('süresi geçen ilanlar kalkar', () => {
    const s = createInitialState(3);
    s.time = Math.max(...s.jobs.map((j) => j.expiresAt));
    refreshJobs(s, world, new Rng(1), 0);
    expect(s.jobs).toEqual([]);
  });
});
