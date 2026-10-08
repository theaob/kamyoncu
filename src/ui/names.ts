import { getWorld } from '../data/worlds';

/** Şehir adları özel addır, çevrilmez (bkz. City.name). */
export function cityName(worldId: string | null, id: string): string {
  if (!worldId) return id;
  return getWorld(worldId).cities.find((c) => c.id === id)?.name ?? id;
}
