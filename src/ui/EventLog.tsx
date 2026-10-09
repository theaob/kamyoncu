import type { TFunction } from 'i18next';
import { useState } from 'react';
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
          plate: event.params.plate,
          cargo: cargo(event.params.cargo),
          from: city(event.params.from),
          to: city(event.params.to),
        },
      ];
    case 'job.loaded':
      return [
        key,
        {
          plate: event.params.plate,
          city: city(event.params.city),
          cargo: cargo(event.params.cargo),
        },
      ];
    case 'job.delivered':
      return [
        key,
        {
          plate: event.params.plate,
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
          plate: event.params.plate,
          city: city(event.params.city),
          cargo: cargo(event.params.cargo),
          pay: money(event.params.pay),
          penalty: money(event.params.penalty),
          profit: money(event.params.profit),
        },
      ];
    case 'job.rejected':
      return [key, { reason: t(`acceptError.${event.params.reason}`) }];
    case 'fleet.bought':
      return [
        key,
        {
          plate: event.params.plate,
          model: event.params.model,
          city: city(event.params.city),
          price: money(event.params.price),
        },
      ];
    case 'fleet.sold':
      return [key, { plate: event.params.plate, price: money(event.params.price) }];
    case 'fleet.trailerBought':
      return [
        key,
        {
          kind: t(`body.${event.params.kind}`),
          city: city(event.params.city),
          price: money(event.params.price),
        },
      ];
    case 'fleet.trailerSold':
      return [key, { kind: t(`body.${event.params.kind}`), price: money(event.params.price) }];
    case 'fleet.serviceDone':
    case 'fleet.needsService':
      return [key, { plate: event.params.plate }];
    case 'driver.hired':
    case 'driver.fired':
      return [key, { name: event.params.name }];
    case 'market.refreshed':
    case 'time.autoPaused':
      return [key, {}];
    case 'command.failed':
      return [key, { reason: t(`commandError.${event.params.reason}`) }];
  }
}

/**
 * Haritanın üstünde kapanabilir olay günlüğü. Kapalıyken yalnızca son olayı tek satırda
 * gösterir; böylece telefonlarda haritayı örtmez.
 */
export function EventLog() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const log = useGameStore((s) => s.log);
  const worldId = useGameStore((s) => s.worldId);
  const [open, setOpen] = useState(false);
  const text = (entry: (typeof log)[number]) => {
    const [key, params] = describe(entry.event, entry.time, lang, worldId, t);
    return t(key, params);
  };
  const latest = log[0];

  return (
    <section className={open ? 'log open' : 'log'} aria-labelledby="log-title">
      <button
        type="button"
        className="log-toggle"
        aria-expanded={open}
        aria-controls="log-body"
        onClick={() => setOpen((o) => !o)}
      >
        <span id="log-title" className="log-title">
          {t('log.title')}
        </span>
        {!open && latest && (
          <span className="log-latest">
            <time>{formatGameTime(latest.time, lang)}</time> {text(latest)}
          </span>
        )}
        <span className="log-chevron" aria-hidden="true">
          {open ? '▾' : '▴'}
        </span>
      </button>
      {open && (
        <div id="log-body" className="log-body">
          {log.length === 0 ? (
            <p className="log-empty">{t('log.empty')}</p>
          ) : (
            <ol>
              {log.map((entry) => (
                <li key={entry.id}>
                  <time>{formatGameTime(entry.time, lang)}</time>
                  <span>{text(entry)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
