import { BALANCE } from './balance';
import type { Money, Road, VehicleModel, WorldDef } from './types';

export interface Route {
  /** Şehir dizisi; ilk eleman çıkış, son eleman varış. */
  cities: string[];
  /** `cities[i] → cities[i + 1]` yolları. */
  roads: Road[];
  km: number;
  /** Kamyonetle tahmini sürüş süresi, oyun dakikası; ağır araçta hız çarpanına bölünür. */
  minutes: number;
  /** Ücretli (otoyol) km; geçiş ücreti araç sınıfına göre hesaplanır. */
  motorwayKm: number;
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
export function roadMinutes(road: Road, speedFactor = 1): number {
  return (road.km / (BALANCE.roadSpeedKmh[road.kind] * speedFactor)) * 60;
}

/** Yalnızca otoyollar ücretlidir; fiyat aracın ücret sınıfına göre. */
export function motorwayToll(km: number, tollClass: VehicleModel['tollClass']): Money {
  return Math.round(km * BALANCE.motorwayTollPerKm[tollClass]);
}

export function roadToll(road: Road, tollClass: VehicleModel['tollClass']): Money {
  return road.kind === 'otoyol' ? motorwayToll(road.km, tollClass) : 0;
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
    motorwayKm: roads.reduce((sum, r) => sum + (r.kind === 'otoyol' ? r.km : 0), 0),
  };
}

/** İki şehir arasındaki yol (yönden bağımsız). */
export function roadBetween(world: WorldDef, a: string, b: string): Road | undefined {
  return graphOf(world)
    .get(a)
    ?.find((e) => e.to === b)?.road;
}

/** Yol güzergâhı `fromId` şehrinden başlayacak yönde: [x0, y0, x1, y1, ...]. */
export function roadPath(road: Road, fromId: string): number[] {
  if (fromId === road.from) return road.path;
  const out: number[] = [];
  for (let i = road.path.length - 2; i >= 0; i -= 2) out.push(road.path[i]!, road.path[i + 1]!);
  return out;
}

/** Güzergâh uzunluğunun `t` (0–1) oranındaki nokta ve o andaki gidiş yönü (radyan). */
export function pointAlong(path: number[], t: number): { x: number; y: number; heading: number } {
  let total = 0;
  for (let i = 2; i < path.length; i += 2) {
    total += Math.hypot(path[i]! - path[i - 2]!, path[i + 1]! - path[i - 1]!);
  }
  let left = Math.max(0, Math.min(t, 1)) * total;
  for (let i = 2; i < path.length; i += 2) {
    const ax = path[i - 2]!;
    const ay = path[i - 1]!;
    const dx = path[i]! - ax;
    const dy = path[i + 1]! - ay;
    const len = Math.hypot(dx, dy);
    if (left <= len || i === path.length - 2) {
      const f = len > 0 ? Math.min(left / len, 1) : 0;
      return { x: ax + dx * f, y: ay + dy * f, heading: Math.atan2(dy, dx) };
    }
    left -= len;
  }
  return { x: path[0]!, y: path[1]!, heading: 0 };
}

/** Kamyonun harita konumu (km); yoldaysa yol güzergâhı boyunca kat ettiği oranda. */
export function truckPosition(
  world: WorldDef,
  truck: { cityId: string; trip: { route: string[]; leg: number; legKm: number } | null },
): { x: number; y: number; heading: number | null } {
  const city = (id: string) => world.cities.find((c) => c.id === id)!;
  const trip = truck.trip;
  const here = city(truck.cityId);
  if (!trip || trip.leg >= trip.route.length - 1) return { x: here.x, y: here.y, heading: null };
  const a = city(trip.route[trip.leg]!);
  const b = city(trip.route[trip.leg + 1]!);
  const road = roadBetween(world, a.id, b.id);
  if (!road) return { x: a.x, y: a.y, heading: Math.atan2(b.y - a.y, b.x - a.x) };
  return pointAlong(roadPath(road, a.id), trip.legKm / road.km);
}

/** Şehir dizisinden oluşan rotanın çizgisi: ardışık yol güzergâhları uç uca. */
export function routePath(world: WorldDef, cities: string[]): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < cities.length; i++) {
    const road = roadBetween(world, cities[i]!, cities[i + 1]!);
    if (!road) continue;
    const path = roadPath(road, cities[i]!);
    out.push(...(out.length ? path.slice(2) : path));
  }
  return out;
}
