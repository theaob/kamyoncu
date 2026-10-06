/** Yol türü. Faz 1'de geçiş ücretleri ve hızlar bu türe göre belirlenecek. */
export type RoadKind = 'otoyol' | 'devlet' | 'il';

export interface City {
  id: string;
  /** Özel ad; çevrilmez (İstanbul her dilde İstanbul). */
  name: string;
  lon: number;
  lat: number;
  /** Harita koordinatı, km (bkz. geo.ts). */
  x: number;
  y: number;
  /** 1 = küçük, 3 = metropol. Etiket görünürlüğü ve ileride yük üretimi için. */
  size: 1 | 2 | 3;
}

export interface Road {
  id: string;
  from: string;
  to: string;
  /** Yol mesafesi, km. */
  km: number;
  kind: RoadKind;
}

/** Harita koordinatlarında (km) bir çokgen: [x0, y0, x1, y1, ...]. */
export type Polygon = number[];

/** Statik dünya verisi. Oyun durumuna kopyalanmaz; kimliğiyle başvurulur. */
export interface WorldDef {
  id: string;
  era: number;
  cities: City[];
  roads: Road[];
  land: Polygon[];
  water: Polygon[];
}

/** Oyun hızı çarpanları. Duraklatma ayrı bir bayraktır; devam edince son hız korunur. */
export const SPEEDS = [1, 2, 4, 8, 16] as const;
export type Speed = (typeof SPEEDS)[number];

/** Kaydedilen oyun durumunun tamamı. Yalnızca serileştirilebilir veri içerir. */
export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  /** Oyun başlangıcından beri geçen oyun dakikası. */
  time: number;
  speed: Speed;
  paused: boolean;
  activeWorldId: string;
}

/**
 * Çekirdek metin üretmez: olaylar kod + parametre olarak yayınlanır,
 * metne çevirme arayüzün işidir (bkz. plan 5.4).
 */
export type SimEvent = { code: 'time.newDay'; params: { day: number } };

export type SimEventCode = SimEvent['code'];

/** Çeviri dosyalarının her olay kodunu kapsadığını test etmek için. */
export const EVENT_CODES: readonly SimEventCode[] = ['time.newDay'];

export type Command =
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'setPaused'; paused: boolean }
  | { type: 'togglePause' };
