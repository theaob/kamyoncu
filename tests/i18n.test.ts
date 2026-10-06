import { describe, expect, it } from 'vitest';
import { EVENT_CODES } from '../src/core/types';
import { formatGameDate, formatGameTime, formatMoney, upper } from '../src/i18n/format';
import { detectLanguage, LANGUAGES } from '../src/i18n/languages';
import en from '../src/locales/en.json';
import tr from '../src/locales/tr.json';

type Tree = { [k: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.set(key, v);
    else for (const [kk, vv] of flatten(v, key)) out.set(kk, vv);
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

const locales: Record<string, Map<string, string>> = { tr: flatten(tr), en: flatten(en) };

describe('çeviriler', () => {
  it('her dil için çeviri dosyası var', () => {
    expect(Object.keys(locales).sort()).toEqual([...LANGUAGES].sort());
  });

  it('tüm diller aynı anahtarlara sahip', () => {
    const trKeys = [...locales.tr!.keys()].sort();
    for (const lang of LANGUAGES) expect([...locales[lang]!.keys()].sort(), lang).toEqual(trKeys);
  });

  it('boş çeviri yok', () => {
    for (const lang of LANGUAGES) {
      for (const [k, v] of locales[lang]!) expect(v.trim(), `${lang}:${k}`).not.toBe('');
    }
  });

  it('değişkenler dillerde aynı', () => {
    for (const [k, v] of locales.tr!) {
      expect(placeholders(locales.en!.get(k)!), k).toEqual(placeholders(v));
    }
  });

  it('her simülasyon olayının çevirisi var', () => {
    for (const code of EVENT_CODES) {
      for (const lang of LANGUAGES)
        expect(locales[lang]!.has(`events.${code}`), `${lang}:${code}`).toBe(true);
    }
  });
});

describe('dil seçimi', () => {
  it('kayıtlı seçim önceliklidir', () => {
    expect(detectLanguage('en', ['tr-TR'])).toBe('en');
  });
  it('tarayıcı Türkçeyse Türkçe, değilse İngilizce', () => {
    expect(detectLanguage(null, ['tr-TR', 'en'])).toBe('tr');
    expect(detectLanguage(null, ['de-DE', 'en-US'])).toBe('en');
    expect(detectLanguage('xx', [])).toBe('en');
  });
});

describe('biçimlendirme', () => {
  it('oyun tarihi her iki dilde', () => {
    expect(formatGameDate(0, 'tr')).toContain('Ocak 2026');
    expect(formatGameDate(0, 'en')).toContain('January 2026');
    expect(formatGameTime(0, 'tr')).toBe('08:00');
    expect(formatGameTime(24 * 60 - 1, 'en')).toBe('07:59');
  });

  it('para birimi', () => {
    expect(formatMoney(1250000, 'tr')).toMatch(/1\.250\.000/);
    expect(formatMoney(1250000, 'en')).toMatch(/1,250,000/);
  });

  it('Türkçe büyük harf İ/ı kuralına uyar', () => {
    expect(upper('istanbul', 'tr')).toBe('İSTANBUL');
    expect(upper('diyarbakır', 'tr')).toBe('DİYARBAKIR');
  });
});
