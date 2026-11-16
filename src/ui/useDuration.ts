import { useTranslation } from 'react-i18next';
import { LONG_DURATION_HOURS, splitDuration } from '../i18n/format';

/** Oyun dakikasını "5 sa 20 dk" biçiminde yazan işlev döndürür. */
export function useDuration(): (minutes: number) => string {
  const { t } = useTranslation();
  return (minutes) => {
    const { d, dh, h, m } = splitDuration(minutes);
    if (h >= LONG_DURATION_HOURS) return t('units.durationDays', { d, h: dh });
    return h > 0 ? t('units.duration', { h, m }) : t('units.durationShort', { m });
  };
}
