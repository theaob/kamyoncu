import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { SimEvent } from '../core/types';
import { currentLanguage } from '../i18n';
import { formatGameDate, formatGameTime, formatKurus } from '../i18n/format';
import type { Lang } from '../i18n/languages';
import { useGameStore } from '../store/gameStore';
import { cityName } from './names';

/** Olay kodunu çeviri anahtarına ve parametrelerine çevirir. */
function describe(
  event: SimEvent,
  time: number,
  lang: Lang,
  worldId: string | null,
  t: TFunction,
): [key: string, params: Record<string, string | number>] {
  const key = `events.${event.code}`;
  const city = (id: string) => cityName(worldId, id);
  const cargo = (id: string) => t(`cargo.${id}`);
  const money = (k: number) => formatKurus(k, lang);
  switch (event.code) {
    case 'time.newDay':
      return [key, { date: formatGameDate(time, lang) }];
    case 'job.accepted':
      return [
        key,
        {
          cargo: cargo(event.params.cargo),
          from: city(event.params.from),
          to: city(event.params.to),
        },
      ];
    case 'job.loaded':
      return [key, { city: city(event.params.city), cargo: cargo(event.params.cargo) }];
    case 'job.delivered':
      return [
        key,
        {
          city: city(event.params.city),
          cargo: cargo(event.params.cargo),
          pay: money(event.params.pay),
          profit: money(event.params.profit),
        },
      ];
    case 'job.deliveredLate':
      return [
        key,
        {
          city: city(event.params.city),
          cargo: cargo(event.params.cargo),
          pay: money(event.params.pay),
          penalty: money(event.params.penalty),
          profit: money(event.params.profit),
        },
      ];
    case 'job.rejected':
      return [key, { reason: t(`acceptError.${event.params.reason}`) }];
  }
}

export function EventLog() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const log = useGameStore((s) => s.log);
  const worldId = useGameStore((s) => s.worldId);

  return (
    <section className="log" aria-labelledby="log-title">
      <h2 id="log-title">{t('log.title')}</h2>
      {log.length === 0 ? (
        <p className="log-empty">{t('log.empty')}</p>
      ) : (
        <ol>
          {log.map((entry) => {
            const [key, params] = describe(entry.event, entry.time, lang, worldId, t);
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
