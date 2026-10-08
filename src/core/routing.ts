import { BALANCE } from './balance';
import type { Money, Road, WorldDef } from './types';

export interface Route {
  /** Şehir dizisi; ilk eleman çıkış, son eleman varış. */
  cities: string[];
  /** `cities[i] → cities[i + 1]` yolları. */
  roads: Road[];
  km: number;
  /** Tahmini sürüş süresi, oyun dakikası. */
  minutes: number;
  tolls: Money;
}

interface Edge {
  to: string;
  road: Road;
}

const graphs = new WeakMap<WorldDef, Map<string, Edge[]>>();

function graphOf(world: WorldDef): Map<string, Edge[]> {
  let graph = graphs.get(world);
  if (graph) return graph;
  graph = new Map(world.cities.map((c) => [c.id, [] as Edge[]]));
  for (const road of world.roads) {
    graph.get(road.from)?.push({ to: road.to, road });
    graph.get(road.to)?.push({ to: road.from, road });
  }
  graphs.set(world, graph);
  return graph;
}

/** Bir yolun sürüş süresi, oyun dakikası. */
export function roadMinutes(road: Road): number {
  return (road.km / BALANCE.roadSpeedKmh[road.kind]) * 60;
}

export function roadToll(road: Road): Money {
  return Math.round(road.km * BALANCE.tollPerKm[road.kind]);
}

/**
 * En hızlı rota (Dijkstra, süreye göre). Faz 1 ağı küçük olduğu için basit
 * dizi tabanlı öncelik kuyruğu yeterli; 81 il için de milisaniyenin altında.
 * Bağlantı yoksa `null`.
 */
export function findRoute(world: WorldDef, from: string, to: string): Route | null {
  const graph = graphOf(world);
  if (!graph.has(from) || !graph.has(to)) return null;
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, Edge & { from: string }>();
  const done = new Set<string>();
  const open = [from];

  while (open.length > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      if (dist.get(open[i]!)! < dist.get(open[best]!)!) best = i;
    }
    const node = open.splice(best, 1)[0]!;
    if (node === to) break;
    if (done.has(node)) continue;
    done.add(node);
    for (const edge of graph.get(node)!) {
      const d = dist.get(node)! + roadMinutes(edge.road);
      if (d < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, d);
        prev.set(edge.to, { ...edge, from: node });
        open.push(edge.to);
      }
    }
  }

  if (!dist.has(to)) return null;
  const cities = [to];
  const roads: Road[] = [];
  for (let at = to; at !== from;) {
    const step = prev.get(at)!;
    roads.unshift(step.road);
    cities.unshift(step.from);
    at = step.from;
  }
  return {
    cities,
    roads,
    km: roads.reduce((sum, r) => sum + r.km, 0),
    minutes: dist.get(to)!,
    tolls: roads.reduce((sum, r) => sum + roadToll(r), 0),
  };
}

/** İki şehir arasındaki yol (yönden bağımsız). */
export function roadBetween(world: WorldDef, a: string, b: string): Road | undefined {
  return graphOf(world)
    .get(a)
    ?.find((e) => e.to === b)?.road;
}

/** Kamyonun harita konumu (km); yoldaysa iki şehir arasında doğrusal ara değer. */
export function truckPosition(
  world: WorldDef,
  truck: { cityId: string; trip: { route: string[]; leg: number; legKm: number } | null },
): { x: number; y: number } {
  const city = (id: string) => world.cities.find((c) => c.id === id)!;
  const trip = truck.trip;
  const here = city(truck.cityId);
  if (!trip || trip.leg >= trip.route.length - 1) return { x: here.x, y: here.y };
  const a = city(trip.route[trip.leg]!);
  const b = city(trip.route[trip.leg + 1]!);
  const road = roadBetween(world, a.id, b.id);
  const t = road ? Math.min(trip.legKm / road.km, 1) : 0;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
