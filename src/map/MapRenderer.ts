import { Application, Container, Graphics, Text } from 'pixi.js';
import type { RoadKind, WorldDef } from '../core/types';
import { routePath } from '../core/routing';
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
import {
  MAP_COLORS,
  OTOYOL_CASING_PX,
  ROAD_WIDTH_PX,
  ROUTE_CASING_PX,
  ROUTE_WIDTH_PX,
} from './palette';

const ROAD_ORDER: RoadKind[] = ['il', 'devlet', 'otoyol'];
/** Küçük şehir etiketleri bu yakınlaştırmanın (piksel/km) üstünde görünür. */
const SMALL_LABEL_ZOOM = 1.1;

export interface TruckMarker {
  id: string;
  x: number;
  y: number;
  /** Gidiş yönü (radyan, +x = doğu); şehirde beklerken null, son yön korunur. */
  heading: number | null;
  /** Seçili araç sarı ve en üstte çizilir. */
  selected: boolean;
  /** Aynı noktadaki araçların sırası; işaretler ekran pikseliyle kaydırılır. */
  stack: number;
}

/** Harita üzerine çizilen oyun durumu: araçlar ve seçili aracın rotaları (şehir kimliği dizileri). */
export interface MapOverlay {
  trucks: TruckMarker[];
  activeRoute: string[] | null;
  previewEmpty: string[] | null;
  previewLoaded: string[] | null;
}

const EMPTY_OVERLAY: MapOverlay = {
  trucks: [],
  activeRoute: null,
  previewEmpty: null,
  previewLoaded: null,
};

/** Kamyon işaretinin hedef konuma yaklaşma hızı (kare başına oran); adımlar arası akıcılık için. */
const TRUCK_SMOOTHING = 0.25;

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
  private readonly routes = new Graphics();
  private readonly truckLayer = new Container();
  private readonly truckNodes = new Map<
    string,
    {
      node: Container;
      body: Graphics;
      pos: { x: number; y: number };
      angle: number;
      selected: boolean | null;
    }
  >();
  private overlay: MapOverlay = EMPTY_OVERLAY;
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
    // Canvas metni yazı tipini kendisi yüklemez; etiketlerden önce açıkça yükle.
    await Promise.all(
      ['500 12px "IBM Plex Sans"', '600 14px "IBM Plex Sans"'].map((f) =>
        document.fonts.load(f, 'İstanbulığüşöç').catch(() => []),
      ),
    );
    if (this.destroyed) {
      this.app.destroy(true, { children: true });
      return;
    }
    const canvas = this.app.canvas;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', this.ariaLabel);
    canvas.style.touchAction = 'none';
    this.host.appendChild(canvas);

    this.app.stage.addChild(this.world);
    this.drawLand();
    this.world.addChild(this.roads);
    this.world.addChild(this.routes);
    this.drawCities();
    this.world.addChild(this.truckLayer);
    this.app.ticker.add(() => this.moveTrucks());

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

  setOverlay(overlay: MapOverlay): void {
    const routesChanged =
      overlay.activeRoute !== this.overlay.activeRoute ||
      overlay.previewEmpty !== this.overlay.previewEmpty ||
      overlay.previewLoaded !== this.overlay.previewLoaded;
    this.overlay = overlay;
    if (!this.ready) return;
    if (routesChanged) this.drawRoutes();
    this.syncTrucks();
    this.moveTrucks();
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
    this.drawRoutes();
    for (const t of this.truckNodes.values()) t.node.scale.set(1 / zoom);
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
        .stroke({ width: 1.2, color: MAP_COLORS.coast, pixelLine: false });
    }
    for (const poly of this.def.water) {
      g.poly(poly).fill(MAP_COLORS.sea).stroke({ width: 1, color: MAP_COLORS.coast });
    }
    this.world.addChild(g);
  }

  /** Yollar her yakınlaştırmada yeniden çizilir, böylece kalınlık piksel cinsinden sabit kalır. */
  private drawRoads(): void {
    const g = this.roads;
    const k = 1 / this.camera.zoom;
    g.clear();
    const segment = (kind: RoadKind | 'casing') => {
      for (const r of this.def.roads) {
        if (kind === 'casing' ? r.kind !== 'otoyol' : r.kind !== kind) continue;
        const p = r.path;
        g.moveTo(p[0]!, p[1]!);
        for (let i = 2; i < p.length; i += 2) g.lineTo(p[i]!, p[i + 1]!);
      }
    };
    segment('casing');
    g.stroke({
      width: OTOYOL_CASING_PX * k,
      color: MAP_COLORS.otoyolCasing,
      cap: 'round',
      join: 'round',
    });
    for (const kind of ROAD_ORDER) {
      segment(kind);
      g.stroke({
        width: ROAD_WIDTH_PX[kind] * k,
        color: MAP_COLORS[kind],
        cap: 'round',
        join: 'round',
      });
    }
  }

  /** Rotalar da yakınlaştırmayla yeniden çizilir (sabit piksel kalınlığı). */
  private drawRoutes(): void {
    const g = this.routes;
    const k = 1 / this.camera.zoom;
    g.clear();
    const line = (route: string[] | null, width: number, color: number) => {
      if (!route || route.length < 2) return;
      const p = routePath(this.def, route);
      if (p.length < 4) return;
      g.moveTo(p[0]!, p[1]!);
      for (let i = 2; i < p.length; i += 2) g.lineTo(p[i]!, p[i + 1]!);
      g.stroke({ width: width * k, color, cap: 'round', join: 'round' });
    };
    const { activeRoute, previewEmpty, previewLoaded } = this.overlay;
    line(activeRoute, ROUTE_CASING_PX, MAP_COLORS.routeCasing);
    line(activeRoute, ROUTE_WIDTH_PX, MAP_COLORS.routeActive);
    line(previewEmpty, ROUTE_WIDTH_PX - 1, MAP_COLORS.routeEmpty);
    line(previewLoaded, ROUTE_CASING_PX, MAP_COLORS.labelHalo);
    line(previewLoaded, ROUTE_WIDTH_PX, MAP_COLORS.routePreview);
  }

  /** Araç işaretlerini ekler/kaldırır; renk yalnızca seçim değişince yeniden çizilir. */
  private syncTrucks(): void {
    const ids = new Set(this.overlay.trucks.map((t) => t.id));
    for (const [id, t] of this.truckNodes) {
      if (!ids.has(id)) {
        t.node.destroy({ children: true });
        this.truckNodes.delete(id);
      }
    }
    for (const marker of this.overlay.trucks) {
      let t = this.truckNodes.get(marker.id);
      if (!t) {
        const node = new Container();
        const body = new Graphics();
        node.addChild(body);
        node.scale.set(1 / this.camera.zoom);
        this.truckLayer.addChild(node);
        t = {
          node,
          body,
          pos: { x: marker.x, y: marker.y },
          angle: marker.heading ?? 0,
          selected: null,
        };
        this.truckNodes.set(marker.id, t);
      }
      // Çok uzağa sıçradıysa (yeni oyun, satın alma) kaydırmadan yerleştir.
      if (Math.hypot(marker.x - t.pos.x, marker.y - t.pos.y) > 200) {
        t.pos = { x: marker.x, y: marker.y };
      }
      t.body.position.set(marker.stack * 7, -marker.stack * 7);
      if (t.selected !== marker.selected) {
        t.selected = marker.selected;
        t.body
          .clear()
          .roundRect(-9, -6, 18, 12, 3)
          .fill(marker.selected ? MAP_COLORS.truck : MAP_COLORS.truckIdle)
          .stroke({ width: 2, color: MAP_COLORS.truckOutline })
          .rect(3, -6, 6, 12)
          .fill(MAP_COLORS.truckOutline);
        t.node.zIndex = marker.selected ? 1 : 0;
      }
    }
    this.truckLayer.sortableChildren = true;
  }

  private moveTrucks(): void {
    for (const marker of this.overlay.trucks) {
      const t = this.truckNodes.get(marker.id);
      if (!t) continue;
      t.pos.x += (marker.x - t.pos.x) * TRUCK_SMOOTHING;
      t.pos.y += (marker.y - t.pos.y) * TRUCK_SMOOTHING;
      t.node.position.set(t.pos.x, t.pos.y);
      if (marker.heading !== null) {
        // En kısa yönden dön (ör. 170° → -170° 20° döner, 340° değil).
        const diff = Math.atan2(
          Math.sin(marker.heading - t.angle),
          Math.cos(marker.heading - t.angle),
        );
        t.angle += diff * TRUCK_SMOOTHING;
      }
      t.body.rotation = t.angle;
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
