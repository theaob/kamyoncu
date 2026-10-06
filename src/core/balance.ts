/**
 * Denge sabitleri. Tüm ayarlanabilir değerler burada toplanır.
 * Not: saat kalibrasyonu Faz 1 denge testlerinde yeniden ele alınacak (plan 3.13).
 */
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
} as const;

export const MINUTES_PER_DAY = 24 * 60;
