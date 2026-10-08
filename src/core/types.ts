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

/** Para: tamsayı kuruş (plan 5.5). */
export type Money = number;

/** Yük türü (statik veri, bkz. data/cargo.ts). */
export interface CargoType {
  id: string;
  /** Ödeme formülündeki km birim fiyatı, kuruş/km. */
  ratePerKm: Money;
  /** Ağırlık aralığı, ton. */
  tons: readonly [number, number];
  /** İlanlarda görülme sıklığı (göreli ağırlık). */
  frequency: number;
  /** Aciliyet katsayısı: daha yüksek ödeme, daha sıkı teslim süresi. */
  urgency: number;
}

/** Araç modeli (statik veri, bkz. data/vehicles.ts). */
export interface VehicleModel {
  id: string;
  /** Araç sınıfı 1–7 (plan 3.2). */
  vehicleClass: number;
  capacityTons: number;
  /** Boşken tüketim, L/100 km. */
  fuelPer100Km: number;
}

/** Yük borsasındaki bir ilan. */
export interface Job {
  id: string;
  from: string;
  to: string;
  cargo: string;
  tons: number;
  /** Teslim mesafesi (yükleme → teslim, en kısa rota), km. */
  km: number;
  pay: Money;
  /** Teslim son tarihi, oyun dakikası. */
  deadline: number;
  /** Kabul edilmezse panodan kalkacağı an, oyun dakikası. */
  expiresAt: number;
}

export type TripPhase = 'toPickup' | 'loading' | 'toDelivery' | 'unloading';

/** Bir kamyonun üzerindeki iş ve yolculuk durumu. */
export interface Trip {
  job: Job;
  phase: TripPhase;
  /** Şu anki yolculuğun şehir dizisi (ilk eleman çıkış şehri). */
  route: string[];
  /** `route[leg] → route[leg + 1]` arasındaki yolda. */
  leg: number;
  /** Bu yolda katedilen km. */
  legKm: number;
  /** Yükleme/boşaltma bitiş anı, oyun dakikası. */
  waitUntil: number;
  /** Kabulden bu yana bu işe harcanan yakıt + geçiş ücreti (kâr gösterimi için). */
  costs: Money;
}

export interface Truck {
  id: string;
  modelId: string;
  /** Bulunduğu ya da en son geçtiği şehir. */
  cityId: string;
  odometerKm: number;
  trip: Trip | null;
}

export type LedgerCategory = 'freight' | 'fuel' | 'tolls' | 'penalties';
export const LEDGER_CATEGORIES: readonly LedgerCategory[] = [
  'freight',
  'fuel',
  'tolls',
  'penalties',
];

/** Bir günün gelir-gider dökümü. Gelir artı, gider eksi işaretlidir. */
export interface LedgerDay {
  day: number;
  amounts: Record<LedgerCategory, Money>;
}

export interface Finance {
  /** Son günler, en yenisi sonda; `BALANCE.ledgerDays` ile sınırlı. */
  days: LedgerDay[];
  /** Kariyer boyu toplamlar. */
  totals: Record<LedgerCategory, Money>;
  deliveries: number;
  lateDeliveries: number;
}

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
  money: Money;
  /** Kimlik üretimi için artan sayaç. */
  nextId: number;
  trucks: Truck[];
  jobs: Job[];
  finance: Finance;
}

/**
 * Çekirdek metin üretmez: olaylar kod + parametre olarak yayınlanır,
 * metne çevirme arayüzün işidir (bkz. plan 5.4).
 */
export type SimEvent =
  | { code: 'time.newDay'; params: { day: number } }
  | { code: 'job.accepted'; params: { from: string; to: string; cargo: string } }
  | { code: 'job.loaded'; params: { city: string; cargo: string } }
  | {
      code: 'job.delivered';
      params: { city: string; cargo: string; pay: Money; profit: Money };
    }
  | {
      code: 'job.deliveredLate';
      params: { city: string; cargo: string; pay: Money; penalty: Money; profit: Money };
    }
  | { code: 'job.rejected'; params: { reason: AcceptError } };

export type SimEventCode = SimEvent['code'];

/** Çeviri dosyalarının her olay kodunu kapsadığını test etmek için. */
export const EVENT_CODES: readonly SimEventCode[] = [
  'time.newDay',
  'job.accepted',
  'job.loaded',
  'job.delivered',
  'job.deliveredLate',
  'job.rejected',
];

export type AcceptError = 'unknownJob' | 'truckBusy' | 'tooHeavy' | 'noRoute';
export const ACCEPT_ERRORS: readonly AcceptError[] = [
  'unknownJob',
  'truckBusy',
  'tooHeavy',
  'noRoute',
];

export type Command =
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'setPaused'; paused: boolean }
  | { type: 'togglePause' }
  | { type: 'acceptJob'; jobId: string; truckId: string };
