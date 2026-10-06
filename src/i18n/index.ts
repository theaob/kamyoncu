import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import tr from '../locales/tr.json';
import { detectLanguage, isLang, STORAGE_KEY, type Lang } from './languages';

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export const initialLanguage = detectLanguage(readStored(), navigator.languages ?? []);

void i18n.use(initReactI18next).init({
  resources: { tr: { translation: tr }, en: { translation: en } },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
document.documentElement.lang = initialLanguage;

export function setLanguage(lang: Lang): void {
  void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Depolama kapalıysa seçim yalnızca bu oturumda geçerli olur.
  }
}

export function currentLanguage(): Lang {
  return isLang(i18n.language) ? i18n.language : 'en';
}

export default i18n;
