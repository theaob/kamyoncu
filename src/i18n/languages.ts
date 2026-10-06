export const LANGUAGES = ['tr', 'en'] as const;
export type Lang = (typeof LANGUAGES)[number];

export const LOCALES: Record<Lang, string> = { tr: 'tr-TR', en: 'en-GB' };

export const STORAGE_KEY = 'kamyoncu.lang';

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/** Kayıtlı seçim > tarayıcı dili (Türkçe ise) > İngilizce. */
export function detectLanguage(stored: string | null, browserLanguages: readonly string[]): Lang {
  if (isLang(stored)) return stored;
  return browserLanguages.some((l) => l.toLowerCase().startsWith('tr')) ? 'tr' : 'en';
}
