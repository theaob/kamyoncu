import { describe, expect, it } from 'vitest';
import { findRoute, roadMinutes, truckPosition } from '../src/core/routing';
import { getWorld } from '../src/data/worlds';

const world = getWorld('tr');

describe('rota bulma', () => {
  it('aynı şehir için tek elemanlı rota', () => {
    expect(findRoute(world, 'ank', 'ank')).toMatchObject({ cities: ['ank'], km: 0, minutes: 0 });
  });

  it('komşu şehirler doğrudan bağlanır', () => {
    const r = findRoute(world, 'ist', 'koc')!;
    expect(r.cities).toEqual(['ist', 'koc']);
    expect(r.km).toBe(110);
    expect(r.tolls).toBeGreaterThan(0); // otoyol
  });

  it('en hızlı rotayı seçer: İstanbul → Ankara otoyoldan', () => {
    const r = findRoute(world, 'ist', 'ank')!;
    expect(r.cities).toEqual(['ist', 'koc', 'ank']);
    expect(r.minutes).toBeCloseTo(roadMinutes(r.roads[0]!) + roadMinutes(r.roads[1]!));
  });

  it('yön fark etmez', () => {
    const a = findRoute(world, 'izm', 'erz')!;
    const b = findRoute(world, 'erz', 'izm')!;
    expect(b.km).toBe(a.km);
    expect(b.cities).toEqual([...a.cities].reverse());
  });

  it('bilinmeyen şehirde null', () => {
    expect(findRoute(world, 'ist', 'yok')).toBeNull();
  });

  it('her şehir çifti için rota var ve rota yolları ardışık', () => {
    for (const a of world.cities) {
      for (const b of world.cities) {
        const r = findRoute(world, a.id, b.id)!;
        expect(r, `${a.id}-${b.id}`).not.toBeNull();
        r.roads.forEach((road, i) => {
          expect([road.from, road.to].sort()).toEqual([r.cities[i], r.cities[i + 1]].sort());
        });
      }
    }
  });
});

describe('kamyon konumu', () => {
  it('yolun ortasında iki şehrin ortasındadır', () => {
    const ist = world.cities.find((c) => c.id === 'ist')!;
    const koc = world.cities.find((c) => c.id === 'koc')!;
    const p = truckPosition(world, {
      cityId: 'ist',
      trip: { route: ['ist', 'koc'], leg: 0, legKm: 55 },
    });
    expect(p.x).toBeCloseTo((ist.x + koc.x) / 2);
    expect(p.y).toBeCloseTo((ist.y + koc.y) / 2);
  });
});
