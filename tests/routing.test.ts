import { describe, expect, it } from 'vitest';
import { findRoute, roadBetween, roadMinutes, routePath, truckPosition } from '../src/core/routing';
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
    expect(r.motorwayKm).toBe(110); // otoyol
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
  const ist = world.cities.find((c) => c.id === 'ist')!;
  const koc = world.cities.find((c) => c.id === 'koc')!;
  const at = (route: string[], legKm: number) =>
    truckPosition(world, { cityId: route[0]!, trip: { route, leg: 0, legKm } });

  it('yolun başında ve sonunda şehirlerdedir', () => {
    expect(at(['ist', 'koc'], 0)).toMatchObject({ x: ist.x, y: ist.y });
    const end = at(['ist', 'koc'], 110);
    expect(end.x).toBeCloseTo(koc.x);
    expect(end.y).toBeCloseTo(koc.y);
  });

  it('yolun ortasında güzergâhın bir köşesinin üzerindedir, düz çizginin değil', () => {
    const p = at(['ist', 'koc'], 55);
    const road = roadBetween(world, 'ist', 'koc')!;
    const onPath = road.path.some((_, i) => {
      if (i % 2 || i + 3 >= road.path.length) return false;
      const [ax, ay, bx, by] = road.path.slice(i, i + 4) as [number, number, number, number];
      const cross = (bx - ax) * (p.y - ay) - (by - ay) * (p.x - ax);
      return Math.abs(cross) / Math.hypot(bx - ax, by - ay) < 1e-6;
    });
    expect(onPath).toBe(true);
    expect(Math.hypot(p.x - (ist.x + koc.x) / 2, p.y - (ist.y + koc.y) / 2)).toBeGreaterThan(1);
  });

  it('ters yönde aynı güzergâhı tersten izler ve yönü ters döner', () => {
    const fwd = at(['ist', 'koc'], 30);
    const back = at(['koc', 'ist'], 80);
    expect(back.x).toBeCloseTo(fwd.x);
    expect(back.y).toBeCloseTo(fwd.y);
    expect(Math.cos(back.heading! - fwd.heading!)).toBeCloseTo(-1);
  });

  it('rota çizgisi yol güzergâhlarını uç uca ekler', () => {
    const path = routePath(world, ['ist', 'koc', 'ank']);
    const a = roadBetween(world, 'ist', 'koc')!.path;
    const b = roadBetween(world, 'koc', 'ank')!.path;
    expect(path.length).toBe(a.length + b.length - 2);
    expect(path.slice(0, 2)).toEqual([ist.x, ist.y]);
  });

  it('şehirde beklerken yönü yoktur', () => {
    expect(truckPosition(world, { cityId: 'ist', trip: null }).heading).toBeNull();
  });
});
