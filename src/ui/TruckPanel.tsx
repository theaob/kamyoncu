import { useTranslation } from 'react-i18next';
import { MINUTES_PER_DAY } from '../core/balance';
import { tripProgress } from '../core/economy';
import { getVehicleModel } from '../data/vehicles';
import { getWorld } from '../data/worlds';
import { currentLanguage } from '../i18n';
import { formatGameTime, formatKurus, formatNumber } from '../i18n/format';
import { useGameStore } from '../store/gameStore';
import { cityName } from './names';
import { useDuration } from './useDuration';

export function TruckPanel({ onOpenBoard }: { onOpenBoard: () => void }) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const duration = useDuration();
  const worldId = useGameStore((s) => s.worldId);
  const truck = useGameStore((s) => s.trucks[0]);
  const now = useGameStore((s) => s.clock.time);
  if (!truck || !worldId) return null;
  const model = getVehicleModel(truck.modelId);
  const trip = truck.trip;
  const city = (id: string) => cityName(worldId, id);

  let status: string;
  if (!trip) status = t('truck.status.idle', { city: city(truck.cityId) });
  else {
    const target =
      trip.phase === 'toPickup' || trip.phase === 'loading' ? trip.job.from : trip.job.to;
    status = t(`truck.status.${trip.phase}`, { city: city(target) });
  }
  const p = trip ? tripProgress(getWorld(worldId), truck, now) : null;
  const when = (minutes: number) =>
    `${t('clock.day', { day: Math.floor(minutes / MINUTES_PER_DAY) + 1 })}, ${formatGameTime(minutes, lang)}`;
  const late = trip && p ? p.eta > trip.job.deadline : false;

  return (
    <div className="truck">
      <div className="truck-head">
        <span className="plate" aria-hidden="true">
          34 KMY 01
        </span>
        <div>
          <strong>{t('truck.name')}</strong>
          <small>{t('truck.driver')}</small>
        </div>
      </div>
      <p className="truck-status" aria-live="polite">
        {status}
      </p>
      {trip && p && (
        <dl className="facts">
          <dt>{t('truck.job')}</dt>
          <dd>
            {t(`cargo.${trip.job.cargo}`)}, {city(trip.job.from)} → {city(trip.job.to)}
          </dd>
          <dt>{t('truck.remaining')}</dt>
          <dd>{t('units.km', { km: formatNumber(p.km, lang) })}</dd>
          <dt>{t('truck.eta')}</dt>
          <dd>
            {when(p.eta)} · {duration(p.eta - now)}{' '}
            <span className={late ? 'neg' : 'pos'}>
              ({late ? t('truck.late') : t('truck.onTime')})
            </span>
          </dd>
          <dt>{t('truck.deadline')}</dt>
          <dd>{when(trip.job.deadline)}</dd>
          <dt>{t('jobs.pay')}</dt>
          <dd>{formatKurus(trip.job.pay, lang)}</dd>
          <dt>{t('truck.costs')}</dt>
          <dd>{formatKurus(trip.costs, lang)}</dd>
        </dl>
      )}
      <dl className="facts">
        <dt>{t('truck.capacity')}</dt>
        <dd>{t('units.tons', { tons: formatNumber(model.capacityTons, lang, 1) })}</dd>
        <dt>{t('truck.odometer')}</dt>
        <dd>{t('units.km', { km: formatNumber(truck.odometerKm, lang) })}</dd>
      </dl>
      {!trip && (
        <button type="button" className="primary" onClick={onOpenBoard}>
          {t('truck.goToBoard')}
        </button>
      )}
    </div>
  );
}
