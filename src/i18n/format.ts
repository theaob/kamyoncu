import { BALANCE } from '../core/balance';
import { LOCALES, type Lang } from './languages';

/** Oyun dakikasını gerçek takvim tarihine çevirir (UTC; yerel saat dilimi kaymasın). */
export function gameDate(minutes: number): Date {
  return new Date(BALANCE.startDateUtc + minutes * 60_000);
}

export function formatGameDate(minutes: number, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'short',
  }).format(gameDate(minutes));
}

export function formatGameTime(minutes: number, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(gameDate(minutes));
}

export function formatMoney(amountTry: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALES[lang], {
    style: 'currency',
    currency: 'TRY',
    // "TRY 25,000" yerine her dilde ₺ simgesi.
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).format(amountTry);
}

/** Türkçede İ/ı dönüşümü için büyük harfe çevirme her zaman dile göre yapılır. */
export function upper(text: string, lang: Lang): string {
  return text.toLocaleUpperCase(LOCALES[lang]);
}

/** Çekirdekteki para birimi tamsayı kuruştur. */
export function formatKurus(kurus: number, lang: Lang): string {
  return formatMoney(kurus / 100, lang);
}

export function formatNumber(value: number, lang: Lang, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits }).format(value);
}

/** Bu süreden (saat) uzun süreler gün + saat olarak yazılır ("167 sa" yerine "6 g 23 sa"). */
export const LONG_DURATION_HOURS = 48;

/** Süreyi gün, saat ve dakikaya böler (çeviri metni ayrıca biçimlendirir); `h` toplam saattir. */
export function splitDuration(minutes: number): { d: number; dh: number; h: number; m: number } {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  return { d: Math.floor(h / 24), dh: h % 24, h, m: total % 60 };
}
