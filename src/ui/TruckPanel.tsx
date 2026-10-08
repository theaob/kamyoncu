import { useTranslation } from 'react-i18next';
import { BALANCE, MINUTES_PER_DAY } from '../core/balance';
import { findRoute, roadBetween } from '../core/routing';
import type { Truck } from '../core/types';
import { getVehicleModel } from '../data/vehicles';
import { getWorld } from '../data/worlds';
import { currentLanguage } from '../i18n';
import { formatGameTime, formatKurus, formatNumber } from '../i18n/format';
import { useGameStore } from '../store/gameStore';
import { cityName } from './names';
import { useDuration } from './useDuration';

/** Aktif işin kalan km'si ve tahmini teslim anı (sürüş + kalan yükleme/boşaltma). */
function progress(worldId: string, truck: Truck, now: number) {
  const trip = truck.trip!;
  const world = getWorld(worldId);
  let km = 0;
  let minutes = 0;
  if (trip.phase === 'toPickup' || trip.phase === 'toDelivery') {
    for (let i = trip.leg; i < trip.route.length - 1; i++) {
      const road = roadBetween(world, trip.route[i]!, trip.route[i + 1]!)!;
      const left = i === trip.leg ? road.km - trip.legKm : road.km;
      km += left;
      minutes += (left / BALANCE.roadSpeedKmh[road.kind]) * 60;
    }
  } else {
    minutes += Math.max(trip.waitUntil - now, 0);
  }
  if (trip.phase === 'toPickup') {
    const loaded = findRoute(world, trip.job.from, trip.job.to);
    km += loaded?.km ?? 0;
    minutes += BALANCE.loadingMinutes + (loaded?.minutes ?? 0);
  }
  if (trip.phase !== 'unloading') minutes += BALANCE.unloadingMinutes;
  return { km, eta: now + minutes };
}

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
  const p = trip ? progress(worldId, truck, now) : null;
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
