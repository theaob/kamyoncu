import { Application, Container, Graphics, Text } from 'pixi.js';
import type { RoadKind, WorldDef } from '../core/types';
import {
  boundsOf,
  clampToBounds,
  fitBounds,
  pan,
  zoomAt,
  type Bounds,
  type Camera,
  type Viewport,
} from './camera';
import { MAP_COLORS, OTOYOL_CASING_PX, ROAD_WIDTH_PX } from './palette';

const ROAD_ORDER: RoadKind[] = ['il', 'devlet', 'otoyol'];
/** Küçük şehir etiketleri bu yakınlaştırmanın (piksel/km) üstünde görünür. */
const SMALL_LABEL_ZOOM = 1.1;

interface CityNode {
  node: Container;
  label: Text;
  size: number;
}

/**
 * WebGL (PixiJS) harita. Dünya koordinatları km; kamera konteyneri ölçekler.
 * Çizgi kalınlıkları ve şehir işaretleri yakınlaştırmadan bağımsız sabit piksel boyutundadır.
 */
export class MapRenderer {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly roads = new Graphics();
  private readonly cities: CityNode[] = [];
  private bounds: Bounds;
  private camera: Camera = { cx: 0, cy: 0, zoom: 1 };
  private zoomLimits = { min: 0.2, max: 8 };
  private resizeObserver: ResizeObserver | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private destroyed = false;
  private ready = false;
  private ariaLabel = '';

  constructor(
    private readonly host: HTMLElement,
    private readonly def: WorldDef,
  ) {
    this.bounds = boundsOf(def.land);
  }

  async init(): Promise<void> {
    await this.app.init({
      resizeTo: this.host,
      background: MAP_COLORS.sea,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    if (this.destroyed) {
      this.app.destroy(true, { children: true });
      return;
    }
    await document.fonts?.ready;
    const canvas = this.app.canvas;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', this.ariaLabel);
    canvas.style.touchAction = 'none';
    this.host.appendChild(canvas);

    this.app.stage.addChild(this.world);
    this.drawLand();
    this.world.addChild(this.roads);
    this.drawCities();

    this.attachInput(canvas);
    this.resizeObserver = new ResizeObserver(() => this.applyCamera());
    this.resizeObserver.observe(this.host);
    this.ready = true;
    this.reset();
  }

  setAriaLabel(label: string): void {
    this.ariaLabel = label;
    if (this.ready) this.app.canvas.setAttribute('aria-label', label);
  }

  reset(): void {
    if (!this.ready) return;
    const vp = this.viewport();
    this.camera = fitBounds(this.bounds, vp, 32);
    this.zoomLimits = { min: this.camera.zoom * 0.6, max: this.camera.zoom * 12 };
    this.applyCamera();
  }

  zoomBy(factor: number): void {
    if (!this.ready) return;
    const vp = this.viewport();
    this.setCamera(zoomAt(this.camera, vp, vp.width / 2, vp.height / 2, factor, this.zoomLimits));
  }

  destroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    if (this.ready) this.app.destroy(true, { children: true });
  }

  private viewport(): Viewport {
    return { width: this.app.screen.width, height: this.app.screen.height };
  }

  private setCamera(cam: Camera): void {
    this.camera = clampToBounds(cam, this.bounds);
    this.applyCamera();
  }

  private applyCamera(): void {
    const vp = this.viewport();
    const { cx, cy, zoom } = this.camera;
    this.world.scale.set(zoom);
    this.world.position.set(vp.width / 2 - cx * zoom, vp.height / 2 - cy * zoom);
    this.drawRoads();
    for (const c of this.cities) {
      c.node.scale.set(1 / zoom);
      c.label.visible = c.size >= 2 || zoom >= SMALL_LABEL_ZOOM;
    }
  }

  private drawLand(): void {
    const g = new Graphics();
    for (const poly of this.def.land) {
      g.poly(poly)
        .fill(MAP_COLORS.land)
        .stroke({ width: 2, color: MAP_COLORS.coast, pixelLine: false });
    }
    for (const poly of this.def.water) {
      g.poly(poly).fill(MAP_COLORS.sea).stroke({ width: 1.5, color: MAP_COLORS.coast });
    }
    this.world.addChild(g);
  }

  /** Yollar her yakınlaştırmada yeniden çizilir, böylece kalınlık piksel cinsinden sabit kalır. */
  private drawRoads(): void {
    const g = this.roads;
    const k = 1 / this.camera.zoom;
    const byId = new Map(this.def.cities.map((c) => [c.id, c]));
    g.clear();
    const segment = (kind: RoadKind | 'casing') => {
      for (const r of this.def.roads) {
        if (kind === 'casing' ? r.kind !== 'otoyol' : r.kind !== kind) continue;
        const a = byId.get(r.from)!;
        const b = byId.get(r.to)!;
        g.moveTo(a.x, a.y).lineTo(b.x, b.y);
      }
    };
    segment('casing');
    g.stroke({ width: OTOYOL_CASING_PX * k, color: MAP_COLORS.otoyolCasing, cap: 'round' });
    for (const kind of ROAD_ORDER) {
      segment(kind);
      g.stroke({ width: ROAD_WIDTH_PX[kind] * k, color: MAP_COLORS[kind], cap: 'round' });
    }
  }

  private drawCities(): void {
    for (const city of this.def.cities) {
      const node = new Container();
      node.position.set(city.x, city.y);
      const r = 3 + city.size * 2;
      const dot = new Graphics()
        .circle(0, 0, r)
        .fill(MAP_COLORS.cityDot)
        .circle(0, 0, r * 0.45)
        .fill(MAP_COLORS.cityCenter);
      const label = new Text({
        text: city.name,
        style: {
          fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
          fontSize: city.size === 3 ? 14 : 12.5,
          fontWeight: city.size === 3 ? '600' : '500',
          fill: MAP_COLORS.label,
          stroke: { color: MAP_COLORS.labelHalo, width: 4, join: 'round' },
        },
      });
      label.anchor.set(0.5, 1);
      label.position.set(0, -r - 3);
      node.addChild(dot, label);
      this.world.addChild(node);
      this.cities.push({ node, label, size: city.size });
    }
  }

  private attachInput(canvas: HTMLCanvasElement): void {
    const local = (e: PointerEvent | WheelEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const p = local(e);
        const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
        this.setCamera(zoomAt(this.camera, this.viewport(), p.x, p.y, factor, this.zoomLimits));
      },
      { passive: false },
    );
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, local(e));
    });
    canvas.addEventListener('pointermove', (e) => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev) return;
      const p = local(e);
      if (this.pointers.size === 1) {
        this.setCamera(pan(this.camera, p.x - prev.x, p.y - prev.y));
      } else if (this.pointers.size === 2) {
        // İki parmakla yakınlaştırma: parmaklar arası mesafe oranı, orta noktaya göre.
        const other = [...this.pointers.entries()].find(([id]) => id !== e.pointerId)?.[1];
        if (other) {
          const before = Math.hypot(prev.x - other.x, prev.y - other.y);
          const after = Math.hypot(p.x - other.x, p.y - other.y);
          const mid = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
          const midPrev = { x: (prev.x + other.x) / 2, y: (prev.y + other.y) / 2 };
          let cam = pan(this.camera, mid.x - midPrev.x, mid.y - midPrev.y);
          if (before > 0)
            cam = zoomAt(cam, this.viewport(), mid.x, mid.y, after / before, this.zoomLimits);
          this.setCamera(cam);
        }
      }
      this.pointers.set(e.pointerId, p);
    });
    const end = (e: PointerEvent) => this.pointers.delete(e.pointerId);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }
}
