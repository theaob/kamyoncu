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

/** Kasa/dorse türü (plan 3.3). Her yük belirli bir kasa türü ister. */
export type BodyKind = 'tenteli' | 'frigorifik' | 'tanker' | 'konteyner';
export const BODY_KINDS: readonly BodyKind[] = ['tenteli', 'frigorifik', 'tanker', 'konteyner'];
/** Kamyonlara sabit kasa olarak takılabilenler; tanker ve konteyner yalnızca dorsedir. */
export const RIGID_BODIES: readonly BodyKind[] = ['tenteli', 'frigorifik'];

/** Ehliyet sınıfı (plan 3.2); sıralı, üstü altını kapsar. */
export type License = 'B' | 'C1' | 'C' | 'CE';
export const LICENSES: readonly License[] = ['B', 'C1', 'C', 'CE'];

/** Sınıf içi donanım seviyesi (plan 3.2). */
export type Tier = 'economy' | 'standard' | 'premium';
export const TIERS: readonly Tier[] = ['economy', 'standard', 'premium'];

/** Yük türü (statik veri, bkz. data/cargo.ts). */
export interface CargoType {
  id: string;
  body: BodyKind;
  /** Ödeme formülündeki km birim fiyatı, kuruş/km. */
  ratePerKm: Money;
  /** Ton başına ek km fiyatı, kuruş/km/t. */
  ratePerTonKm: Money;
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
  /** Araç sınıfı (plan 3.2): 1–4 kamyon, 6 tır çekicisi. */
  vehicleClass: 1 | 2 | 3 | 4 | 6;
  tier: Tier;
  /** Kurgusal marka ve model adı; özel ad, çevrilmez. */
  name: string;
  /** Kamyonda kasa kapasitesi; çekicide dorseyle taşınabilecek yük. */
  capacityTons: number;
  /** Boşken tüketim, L/100 km. */
  fuelPer100Km: number;
  /** Yol hızlarına çarpan (ağır araçlar daha yavaş). */
  speedFactor: number;
  /** Otoyol ücret sınıfı 1–5. */
  tollClass: 1 | 2 | 3 | 4 | 5;
  license: License;
  /** Çekici: kasası yok, dorse takılır. */
  tractor: boolean;
  /** Sıfır fiyatı (tenteli kasa dahil), kuruş. */
  price: Money;
  /** Kilometre başına durum kaybı, puan. */
  wearPerKm: number;
}

/** Yük borsasındaki bir ilan. */
export interface Job {
  id: string;
  from: string;
  to: string;
  cargo: string;
  body: BodyKind;
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
  /** Plaka; özel ad, çevrilmez. */
  plate: string;
  modelId: string;
  /** Sabit kasa; çekicide `null` (dorse ayrı varlıktır). */
  body: BodyKind | null;
  trailerId: string | null;
  driverId: string | null;
  /** Bulunduğu ya da en son geçtiği şehir. */
  cityId: string;
  odometerKm: number;
  /** Durum, 0–100 (plan 3.2). Kilometreyle düşer, bakımla yükselir. */
  condition: number;
  /** Üretim anı (oyun dakikası; ikinci elde negatif). Yaş ve değer için. */
  builtAt: number;
  trip: Trip | null;
  /** Bakımdaysa bitiş anı. */
  serviceUntil: number | null;
}

export interface Trailer {
  id: string;
  kind: BodyKind;
  /** Bağlı değilse durduğu şehir; bağlıysa çekicinin şehri geçerlidir. */
  cityId: string;
  truckId: string | null;
  builtAt: number;
}

export interface Driver {
  id: string;
  /** Kişi adı; çevrilmez. */
  name: string;
  license: License;
  /** Deneyim seviyesi 1–5: yakıt tasarrufu sağlar. */
  level: number;
  /** Aylık maaş, kuruş. Oyuncunun maaşı yoktur. */
  salary: Money;
  isPlayer: boolean;
}

/** Şoför pazarındaki aday (plan 3.4: her hafta yenilenir). */
export interface Candidate extends Driver {
  expiresAt: number;
}

/** Pazardaki ikinci el araç ilanı. */
export interface UsedListing {
  id: string;
  modelId: string;
  body: BodyKind | null;
  cityId: string;
  odometerKm: number;
  condition: number;
  builtAt: number;
  price: Money;
}

export type LedgerCategory =
  'freight' | 'fuel' | 'tolls' | 'penalties' | 'salaries' | 'maintenance' | 'vehicles';
export const LEDGER_CATEGORIES: readonly LedgerCategory[] = [
  'freight',
  'fuel',
  'tolls',
  'penalties',
  'salaries',
  'maintenance',
  'vehicles',
];
/** İşletme dışı kalemler (araç alım-satımı) net kâra katılmaz, ayrı gösterilir. */
export const OPERATING_CATEGORIES: readonly LedgerCategory[] = LEDGER_CATEGORIES.filter(
  (c) => c !== 'vehicles',
);

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
  trailers: Trailer[];
  drivers: Driver[];
  candidates: Candidate[];
  usedListings: UsedListing[];
  jobs: Job[];
  finance: Finance;
}

/**
 * Çekirdek metin üretmez: olaylar kod + parametre olarak yayınlanır,
 * metne çevirme arayüzün işidir (bkz. plan 5.4).
 */
export type SimEvent =
  | { code: 'time.newDay'; params: { day: number } }
  | { code: 'job.accepted'; params: { plate: string; from: string; to: string; cargo: string } }
  | { code: 'job.loaded'; params: { plate: string; city: string; cargo: string } }
  | {
      code: 'job.delivered';
      params: { plate: string; city: string; cargo: string; pay: Money; profit: Money };
    }
  | {
      code: 'job.deliveredLate';
      params: {
        plate: string;
        city: string;
        cargo: string;
        pay: Money;
        penalty: Money;
        profit: Money;
      };
    }
  | { code: 'job.rejected'; params: { reason: AcceptError } }
  | { code: 'fleet.bought'; params: { plate: string; model: string; city: string; price: Money } }
  | { code: 'fleet.sold'; params: { plate: string; price: Money } }
  | { code: 'fleet.trailerBought'; params: { kind: BodyKind; city: string; price: Money } }
  | { code: 'fleet.trailerSold'; params: { kind: BodyKind; price: Money } }
  | { code: 'fleet.serviceDone'; params: { plate: string } }
  | { code: 'fleet.needsService'; params: { plate: string } }
  | { code: 'driver.hired'; params: { name: string } }
  | { code: 'driver.fired'; params: { name: string } }
  | { code: 'market.refreshed'; params: Record<string, never> }
  | { code: 'command.failed'; params: { reason: CommandError } };

export type SimEventCode = SimEvent['code'];

/** Çeviri dosyalarının her olay kodunu kapsadığını test etmek için. */
export const EVENT_CODES: readonly SimEventCode[] = [
  'time.newDay',
  'job.accepted',
  'job.loaded',
  'job.delivered',
  'job.deliveredLate',
  'job.rejected',
  'fleet.bought',
  'fleet.sold',
  'fleet.trailerBought',
  'fleet.trailerSold',
  'fleet.serviceDone',
  'fleet.needsService',
  'driver.hired',
  'driver.fired',
  'market.refreshed',
  'command.failed',
];

export type AcceptError =
  | 'unknownJob'
  | 'truckBusy'
  | 'inService'
  | 'noDriver'
  | 'license'
  | 'noTrailer'
  | 'wrongBody'
  | 'tooHeavy'
  | 'needsService'
  | 'noRoute';
export const ACCEPT_ERRORS: readonly AcceptError[] = [
  'unknownJob',
  'truckBusy',
  'inService',
  'noDriver',
  'license',
  'noTrailer',
  'wrongBody',
  'tooHeavy',
  'needsService',
  'noRoute',
];

/** Filo, şoför ve pazar komutlarının ret nedenleri. */
export type CommandError =
  | 'notFound'
  | 'noMoney'
  | 'truckBusy'
  | 'lastTruck'
  | 'license'
  | 'driverBusy'
  | 'notTractor'
  | 'differentCity'
  | 'trailerInUse'
  | 'noRigidBody'
  | 'isPlayer'
  | 'notNeeded';
export const COMMAND_ERRORS: readonly CommandError[] = [
  'notFound',
  'noMoney',
  'truckBusy',
  'lastTruck',
  'license',
  'driverBusy',
  'notTractor',
  'differentCity',
  'trailerInUse',
  'noRigidBody',
  'isPlayer',
  'notNeeded',
];

export type Command =
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'setPaused'; paused: boolean }
  | { type: 'togglePause' }
  | { type: 'acceptJob'; jobId: string; truckId: string }
  | { type: 'buyNewTruck'; modelId: string; body: BodyKind | null; cityId: string }
  | { type: 'buyUsedTruck'; listingId: string }
  | { type: 'sellTruck'; truckId: string }
  | { type: 'buyTrailer'; kind: BodyKind; cityId: string }
  | { type: 'sellTrailer'; trailerId: string }
  | { type: 'attachTrailer'; truckId: string; trailerId: string }
  | { type: 'detachTrailer'; truckId: string }
  | { type: 'serviceTruck'; truckId: string }
  | { type: 'hireDriver'; candidateId: string }
  | { type: 'fireDriver'; driverId: string }
  | { type: 'assignDriver'; driverId: string; truckId: string | null };
