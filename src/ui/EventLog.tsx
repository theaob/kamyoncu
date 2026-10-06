import { useTranslation } from 'react-i18next';
import type { SimEvent } from '../core/types';
import { currentLanguage } from '../i18n';
import { formatGameDate, formatGameTime } from '../i18n/format';
import type { Lang } from '../i18n/languages';
import { useGameStore } from '../store/gameStore';

/** Olay kodunu çeviri anahtarına ve parametrelerine çevirir. */
function describe(
  event: SimEvent,
  time: number,
  lang: Lang,
): [key: string, params: Record<string, string | number>] {
  switch (event.code) {
    case 'time.newDay':
      return ['events.time.newDay', { date: formatGameDate(time, lang) }];
  }
}

export function EventLog() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const log = useGameStore((s) => s.log);

  return (
    <section className="log" aria-labelledby="log-title">
      <h2 id="log-title">{t('log.title')}</h2>
      {log.length === 0 ? (
        <p className="log-empty">{t('log.empty')}</p>
      ) : (
        <ol>
          {log.map((entry) => {
            const [key, params] = describe(entry.event, entry.time, lang);
            return (
              <li key={entry.id}>
                <time>{formatGameTime(entry.time, lang)}</time>
                <span>{t(key, params)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
