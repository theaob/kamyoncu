/**
 * Haritada araç seçme: dokunma/tıklama ile sürüklemeyi ayırma ve işaret isabet testi.
 * Saf fonksiyonlar; Pixi'den bağımsız test edilir.
 */

/** Parmak/fare bu kadar pikselden fazla kayarsa dokunma değil kaydırmadır. */
export const TAP_SLOP_PX = 8;

/** İsabet yarıçapı (ekran pikseli): parmak için cömert, fare için işaretin biraz dışı. */
export function hitRadius(pointerType: string): number {
  return pointerType === 'mouse' ? 14 : 24;
}

export interface ScreenMarker {
  id: string;
  x: number;
  y: number;
}

/** (x, y) noktasına `radius` piksel içindeki işaretler, en yakından uzağa. */
export function markersAt(markers: ScreenMarker[], x: number, y: number, radius: number): string[] {
  return markers
    .map((m) => ({ id: m.id, d: Math.hypot(m.x - x, m.y - y) }))
    .filter((m) => m.d <= radius)
    .sort((a, b) => a.d - b.d)
    .map((m) => m.id);
}

export function isTap(start: { x: number; y: number }, end: { x: number; y: number }): boolean {
  return Math.hypot(end.x - start.x, end.y - start.y) <= TAP_SLOP_PX;
}
