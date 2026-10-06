import { describe, expect, it } from 'vitest';
import {
  boundsOf,
  clampToBounds,
  fitBounds,
  pan,
  toScreen,
  toWorld,
  zoomAt,
} from '../src/map/camera';

const vp = { width: 800, height: 600 };

describe('kamera', () => {
  it('toScreen ve toWorld birbirinin tersi', () => {
    const cam = { cx: 100, cy: -50, zoom: 2.5 };
    const s = toScreen(cam, vp, 130, -20);
    const w = toWorld(cam, vp, s.x, s.y);
    expect(w.x).toBeCloseTo(130);
    expect(w.y).toBeCloseTo(-20);
  });

  it('zoomAt imlecin altındaki noktayı sabit tutar', () => {
    const cam = { cx: 0, cy: 0, zoom: 1 };
    const before = toWorld(cam, vp, 600, 150);
    const next = zoomAt(cam, vp, 600, 150, 2, { min: 0.1, max: 10 });
    const after = toWorld(next, vp, 600, 150);
    expect(next.zoom).toBe(2);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('zoomAt sınırlara uyar', () => {
    const cam = { cx: 0, cy: 0, zoom: 1 };
    expect(zoomAt(cam, vp, 0, 0, 100, { min: 0.5, max: 4 }).zoom).toBe(4);
    expect(zoomAt(cam, vp, 0, 0, 0.001, { min: 0.5, max: 4 }).zoom).toBe(0.5);
  });

  it('pan ekran pikselini dünya birimine çevirir', () => {
    expect(pan({ cx: 0, cy: 0, zoom: 2 }, 20, -10)).toEqual({ cx: -10, cy: 5, zoom: 2 });
  });

  it('fitBounds sınırları ekrana sığdırır', () => {
    const b = { minX: -100, minY: -50, maxX: 100, maxY: 50 };
    const cam = fitBounds(b, vp, 0);
    expect(cam).toEqual({ cx: 0, cy: 0, zoom: 4 });
  });

  it('clampToBounds merkezi sınır içinde tutar', () => {
    const b = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    expect(clampToBounds({ cx: -5, cy: 20, zoom: 1 }, b)).toEqual({ cx: 0, cy: 10, zoom: 1 });
  });

  it('boundsOf düz koordinat dizilerinden sınır çıkarır', () => {
    expect(
      boundsOf([
        [0, 0, 5, -2],
        [3, 7],
      ]),
    ).toEqual({ minX: 0, minY: -2, maxX: 5, maxY: 7 });
  });
});
