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
    maximumFractionDigits: 0,
  }).format(amountTry);
}

/** Türkçede İ/ı dönüşümü için büyük harfe çevirme her zaman dile göre yapılır. */
export function upper(text: string, lang: Lang): string {
  return text.toLocaleUpperCase(LOCALES[lang]);
}
