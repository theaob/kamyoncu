import type { RoadKind } from './types';

/**
 * Denge sabitleri. Tüm ayarlanabilir değerler burada toplanır.
 * Not: saat kalibrasyonu Faz 1 denge testlerinde yeniden ele alınacak (plan 3.13).
 * Para değerleri tamsayı kuruştur (plan 5.5); `TL` yardımcı çarpandır.
 */
const TL = 100;

export const BALANCE = {
  /** 1× hızda bir gerçek saniyede geçen oyun dakikası. */
  gameMinutesPerRealSecond: 1,
  /** Oyun takviminin başlangıcı (UTC). */
  startDateUtc: Date.UTC(2026, 0, 1, 8, 0),
  /**
   * Tek seferde işlenecek en uzun gerçek süre (ms). Sekme uykudan dönünce
   * biriken süre bir anda işlenmesin diye.
   */
  maxRealMsPerAdvance: 250,

  /** Başlangıç sermayesi (plan 7). */
  startingMoney: 250_000 * TL,
  /** Oyuncunun başladığı şehir. */
  startCityId: 'ist',

  /** Boş kamyonetin yol türüne göre ortalama hızı, km/sa. */
  roadSpeedKmh: { otoyol: 90, devlet: 75, il: 60 } satisfies Record<RoadKind, number>,
  /** Otoyol geçiş ücreti, kuruş/km (1. sınıf araç). Diğer yollar ücretsiz. */
  tollPerKm: { otoyol: 1.2 * TL, devlet: 0, il: 0 } satisfies Record<RoadKind, number>,
  /** Motorin fiyatı, kuruş/L. Dalgalanma Faz 3'te. */
  dieselPerLiter: 45 * TL,
  /** Tam yükte tüketim artışı (plan 3.6 yakıt formülü). */
  fuelLoadFactor: 0.35,

  /** Yükleme ve boşaltma süresi, oyun dakikası. */
  loadingMinutes: 45,
  unloadingMinutes: 45,

  /** Yük borsası: her şehirde en fazla ilan = boyut × bu değer. */
  jobsPerCitySize: 2,
  /** Yeni ilanlar bu aralıkla (oyun dakikası) üretilir. */
  jobSpawnIntervalMinutes: 60,
  /** Her üretim turunda boş yuva başına ilan çıkma olasılığı. */
  jobSpawnChance: 0.35,
  /** İlan kabul edilmezse panoda kalma süresi, saat [en az, en çok]. */
  jobListingHours: [10, 30] as const,
  /** Ödeme formülündeki taban ücret (plan 3.6). */
  jobBasePay: 750 * TL,
  /**
   * Teslim süresi: tahmini sürüş süresi × [en az, en çok] pay + sabit saat.
   * Yükleme yeri uzaktaysa boş gidiş bu paydan yer; strateji buradan doğar.
   */
  deadlineSlack: [1.3, 2.2] as const,
  deadlineExtraHours: 6,
  /** Gecikme cezası: saat başına ödemenin bu oranı, en çok `maxPenaltyShare`. */
  penaltyPerHourShare: 0.03,
  maxPenaltyShare: 0.5,
  /** İlan için en kısa teslim mesafesi, km. */
  minJobKm: 60,

  /** Finans dökümünde saklanan gün sayısı (kayıt boyutu sınırlı kalsın). */
  ledgerDays: 30,
} as const;

export const MINUTES_PER_DAY = 24 * 60;
export const MINUTES_PER_HOUR = 60;
