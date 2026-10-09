import { project } from '../core/geo';
import type { City, Polygon, Road, RoadKind, WorldDef } from '../core/types';
import trCities from './tr/cities.json';
import trRoads from './tr/roads.json';
import { TR_LAND, TR_WATER } from './tr/outline';

type RawCity = Omit<City, 'x' | 'y'>;
type RawRoad = { from: string; to: string; km: number; kind: string; via?: number[][] };

function toPolygon(points: [number, number][]): Polygon {
  return points.flatMap(([lon, lat]) => {
    const p = project(lon, lat);
    return [p.x, p.y];
  });
}

export function buildWorld(
  id: string,
  era: number,
  rawCities: RawCity[],
  rawRoads: RawRoad[],
  land: [number, number][][],
  water: [number, number][][],
): WorldDef {
  const cities = rawCities.map((c) => ({ ...c, ...project(c.lon, c.lat) }));
  const byId = new Map(cities.map((c) => [c.id, c]));
  const roads: Road[] = rawRoads.map((r) => {
    const a = byId.get(r.from);
    const b = byId.get(r.to);
    const via = toPolygon((r.via ?? []) as [number, number][]);
    return {
      id: `${r.from}-${r.to}`,
      from: r.from,
      to: r.to,
      km: r.km,
      kind: r.kind as RoadKind,
      path: a && b ? [a.x, a.y, ...via, b.x, b.y] : via,
    };
  });
  return { id, era, cities, roads, land: land.map(toPolygon), water: water.map(toPolygon) };
}

export const WORLDS: Record<string, WorldDef> = {
  tr: buildWorld('tr', 1, trCities as RawCity[], trRoads, [TR_LAND], TR_WATER),
};

export function getWorld(id: string): WorldDef {
  const world = WORLDS[id];
  if (!world) throw new Error(`Bilinmeyen dünya: ${id}`);
  return world;
}
