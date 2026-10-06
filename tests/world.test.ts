import { describe, expect, it } from 'vitest';
import { distanceKm, project } from '../src/core/geo';
import { WORLDS } from '../src/data/worlds';

describe('izdüşüm', () => {
  it('İstanbul–Ankara kuş uçuşu ~350 km', () => {
    const d = distanceKm(project(29.0, 41.01), project(32.85, 39.93));
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(370);
  });
});

describe.each(Object.values(WORLDS))('dünya verisi: $id', (world) => {
  const byId = new Map(world.cities.map((c) => [c.id, c]));

  it('şehir kimlikleri benzersiz', () => {
    expect(byId.size).toBe(world.cities.length);
  });

  it('yollar var olan şehirleri bağlar ve tekrar etmez', () => {
    const seen = new Set<string>();
    for (const r of world.roads) {
      expect(byId.has(r.from), r.id).toBe(true);
      expect(byId.has(r.to), r.id).toBe(true);
      const key = [r.from, r.to].sort().join('|');
      expect(seen.has(key), r.id).toBe(false);
      seen.add(key);
    }
  });

  it('yol mesafesi kuş uçuşundan uzun ama makul', () => {
    for (const r of world.roads) {
      const straight = distanceKm(byId.get(r.from)!, byId.get(r.to)!);
      expect(r.km, r.id).toBeGreaterThanOrEqual(straight * 0.95);
      expect(r.km, r.id).toBeLessThanOrEqual(straight * 1.8);
    }
  });

  it('tüm şehirler yol ağıyla birbirine bağlı', () => {
    const adj = new Map<string, string[]>();
    for (const r of world.roads) {
      adj.set(r.from, [...(adj.get(r.from) ?? []), r.to]);
      adj.set(r.to, [...(adj.get(r.to) ?? []), r.from]);
    }
    const start = world.cities[0]!.id;
    const visited = new Set([start]);
    const queue = [start];
    while (queue.length) {
      for (const n of adj.get(queue.shift()!) ?? []) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
    expect(visited.size).toBe(world.cities.length);
  });
});
