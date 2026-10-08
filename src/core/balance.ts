import type { License, RoadKind } from './types';

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

  /**
   * Başlangıç sermayesi (plan 7). Panodaki en pahalı ilk işin yakıt + otoyol
   * giderini (boş gidiş dahil, ~21.500 ₺) karşılar ama birkaç işten fazlasına
   * yetmez; ilk teslimatlar gerçekten önemli olsun diye.
   */
  startingMoney: 25_000 * TL,
  /** Oyuncunun başladığı şehir. */
  startCityId: 'ist',

  /** Kamyonetin yol türüne göre ortalama hızı, km/sa; ağır araçlarda modelin hız çarpanıyla. */
  roadSpeedKmh: { otoyol: 90, devlet: 75, il: 60 } satisfies Record<RoadKind, number>,
  /** Otoyol geçiş ücreti, kuruş/km, ücret sınıfına göre (1–5). Diğer yollar ücretsiz. */
  motorwayTollPerKm: { 1: 1.2 * TL, 2: 1.6 * TL, 3: 2.2 * TL, 4: 2.8 * TL, 5: 4 * TL },
  /** Motorin fiyatı, kuruş/L. Dalgalanma Faz 3'te. */
  dieselPerLiter: 45 * TL,
  /** Tam yükte tüketim artışı (plan 3.6 yakıt formülü). */
  fuelLoadFactor: 0.35,

  /** Yükleme ve boşaltma süresi, oyun dakikası. */
  loadingMinutes: 45,
  unloadingMinutes: 45,

  /** Yük borsası: her şehirde en fazla ilan = boyut × bu değer. */
  jobsPerCitySize: 3,
  /**
   * İlan büyüklüğü dağılımı: [en çok ton, ağırlık]. Kamyonet işleri hep bol kalsın,
   * ağır yükler filo büyüdükçe anlam kazansın diye.
   */
  jobSizeBuckets: [
    [1.5, 6],
    [4, 2],
    [10, 1.5],
    [17, 1.2],
    [25, 1.5],
  ] as const,
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

  /** Oyuncunun ilk aracı: eski, standart seviye kamyonet (plan 3.2 "Başlangıç"). */
  startingTruck: { modelId: 'c1-standard', ageYears: 8, odometerKm: 184_000, condition: 65 },

  /** Durum her puan düştükçe yakıt bu oranda artar (100'de 0, 50'de +%15). */
  conditionFuelPenalty: 0.003,
  /** Bu durumun altındaki araç bakıma girmeden iş alamaz. */
  minConditionForJobs: 25,
  /** Bakım: puan başına maliyet (sıfır fiyatın oranı) ve süre. */
  serviceCostPerPoint: 0.0002,
  serviceMinutesPerPoint: 7.5,
  /** Değer kaybı: ilk yıl çarpanı, yıllık çarpan, km başına kayıp, taban oran. */
  depreciation: { first: 0.9, yearly: 0.88, perKm: 0.0000003, floor: 0.2 },
  /** İkinci el ilan fiyatı = araç değeri × bu çarpan. Satışta değerin kendisi alınır. */
  usedMarkup: 1.1,
  /** Dorse değer kaybı (yıllık çarpan). */
  trailerYearly: 0.9,

  /** Pazar ve şoför adayları bu aralıkla (gün) yenilenir. */
  marketRefreshDays: 7,
  usedListingsCount: 6,
  candidatesCount: 4,
  /** Aday ehliyet dağılımı (göreli ağırlık) ve aylık taban maaş, kuruş (plan 7: 50–90 bin ₺). */
  driverLicenses: [
    ['B', 2],
    ['C1', 2],
    ['C', 3],
    ['CE', 3],
  ] as const satisfies readonly (readonly [License, number])[],
  driverBaseSalary: {
    B: 48_000 * TL,
    C1: 55_000 * TL,
    C: 62_000 * TL,
    CE: 70_000 * TL,
  } satisfies Record<License, number>,
  /** Seviye başına maaş artışı ve yakıt tasarrufu. */
  driverSalaryPerLevel: 5_000 * TL,
  driverFuelSavingPerLevel: 0.02,
  /** Maaşlar günlük ödenir: aylık / bu değer. */
  daysPerMonth: 30,
} as const;

export const MINUTES_PER_DAY = 24 * 60;
export const MINUTES_PER_HOUR = 60;
