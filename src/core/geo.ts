/**
 * Coğrafi koordinatları harita düzlemine (km) çeviren eşdikdörtgen izdüşüm.
 * Türkiye ölçeğinde mesafe hatası %1–2 düzeyindedir; oyun için yeterli.
 */
export const PROJECTION_ORIGIN = { lon: 35, lat: 39 } as const;

const KM_PER_DEG_LAT = 110.57;
const KM_PER_DEG_LON = 111.32 * Math.cos((PROJECTION_ORIGIN.lat * Math.PI) / 180);

export function project(lon: number, lat: number): { x: number; y: number } {
  return {
    x: (lon - PROJECTION_ORIGIN.lon) * KM_PER_DEG_LON,
    y: (PROJECTION_ORIGIN.lat - lat) * KM_PER_DEG_LAT,
  };
}

export function distanceKm(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
