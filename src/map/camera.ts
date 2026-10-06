/**
 * Harita kamerası: ekran merkezindeki dünya noktası (km) ve yakınlaştırma (piksel/km).
 * Saf fonksiyonlar; Pixi'den bağımsız test edilir.
 */
export interface Camera {
  cx: number;
  cy: number;
  zoom: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface ZoomLimits {
  min: number;
  max: number;
}

export function toScreen(cam: Camera, vp: Viewport, x: number, y: number) {
  return { x: (x - cam.cx) * cam.zoom + vp.width / 2, y: (y - cam.cy) * cam.zoom + vp.height / 2 };
}

export function toWorld(cam: Camera, vp: Viewport, sx: number, sy: number) {
  return {
    x: (sx - vp.width / 2) / cam.zoom + cam.cx,
    y: (sy - vp.height / 2) / cam.zoom + cam.cy,
  };
}

/** Sınırları, kenarlarda `padding` piksel boşlukla ekrana sığdırır. */
export function fitBounds(b: Bounds, vp: Viewport, padding = 24): Camera {
  const w = Math.max(b.maxX - b.minX, 1);
  const h = Math.max(b.maxY - b.minY, 1);
  const zoom = Math.min(
    Math.max(vp.width - padding * 2, 1) / w,
    Math.max(vp.height - padding * 2, 1) / h,
  );
  return { cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, zoom };
}

/** Ekrandaki bir noktanın altındaki dünya noktası sabit kalacak şekilde yakınlaştırır. */
export function zoomAt(
  cam: Camera,
  vp: Viewport,
  sx: number,
  sy: number,
  factor: number,
  limits: ZoomLimits,
): Camera {
  const zoom = Math.min(Math.max(cam.zoom * factor, limits.min), limits.max);
  const anchor = toWorld(cam, vp, sx, sy);
  return {
    cx: anchor.x - (sx - vp.width / 2) / zoom,
    cy: anchor.y - (sy - vp.height / 2) / zoom,
    zoom,
  };
}

/** Ekran pikseli cinsinden kaydırma. */
export function pan(cam: Camera, dx: number, dy: number): Camera {
  return { ...cam, cx: cam.cx - dx / cam.zoom, cy: cam.cy - dy / cam.zoom };
}

/** Kamera merkezinin harita sınırlarının dışına kaçmasını engeller. */
export function clampToBounds(cam: Camera, b: Bounds): Camera {
  return {
    ...cam,
    cx: Math.min(Math.max(cam.cx, b.minX), b.maxX),
    cy: Math.min(Math.max(cam.cy, b.minY), b.maxY),
  };
}

export function boundsOf(polygons: number[][]): Bounds {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const poly of polygons) {
    for (let i = 0; i + 1 < poly.length; i += 2) {
      const x = poly[i]!;
      const y = poly[i + 1]!;
      b.minX = Math.min(b.minX, x);
      b.maxX = Math.max(b.maxX, x);
      b.minY = Math.min(b.minY, y);
      b.maxY = Math.max(b.maxY, y);
    }
  }
  return b;
}
