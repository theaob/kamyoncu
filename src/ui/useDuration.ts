import { useTranslation } from 'react-i18next';
import { splitDuration } from '../i18n/format';

/** Oyun dakikasını "5 sa 20 dk" biçiminde yazan işlev döndürür. */
export function useDuration(): (minutes: number) => string {
  const { t } = useTranslation();
  return (minutes) => {
    const { h, m } = splitDuration(minutes);
    return h > 0 ? t('units.duration', { h, m }) : t('units.durationShort', { m });
  };
}
