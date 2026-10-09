import { describe, expect, it } from 'vitest';
import { hitRadius, isTap, markersAt } from '../src/map/picking';

describe('haritada araç seçme', () => {
  const markers = [
    { id: 'a', x: 100, y: 100 },
    { id: 'b', x: 107, y: 93 },
    { id: 'c', x: 300, y: 300 },
  ];

  it('yarıçap içindeki işaretleri yakından uzağa döndürür', () => {
    expect(markersAt(markers, 106, 94, 24)).toEqual(['b', 'a']);
    expect(markersAt(markers, 100, 100, 5)).toEqual(['a']);
  });

  it('boş alana dokunma hiçbir aracı seçmez', () => {
    expect(markersAt(markers, 200, 200, 24)).toEqual([]);
  });

  it('dokunmada isabet alanı fareden geniştir', () => {
    expect(hitRadius('touch')).toBeGreaterThan(hitRadius('mouse'));
    expect(markersAt(markers, 300, 320, hitRadius('mouse'))).toEqual([]);
    expect(markersAt(markers, 300, 320, hitRadius('touch'))).toEqual(['c']);
  });

  it('küçük kayma dokunmadır, sürükleme değil', () => {
    expect(isTap({ x: 10, y: 10 }, { x: 14, y: 13 })).toBe(true);
    expect(isTap({ x: 10, y: 10 }, { x: 30, y: 10 })).toBe(false);
  });
});
