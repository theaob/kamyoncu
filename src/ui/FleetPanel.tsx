import { useTranslation } from 'react-i18next';
import { BALANCE, MINUTES_PER_DAY } from '../core/balance';
import { tripProgress } from '../core/economy';
import {
  licenseCovers,
  serviceQuote,
  trailerOf,
  trailerValue,
  truckSpec,
  truckValue,
} from '../core/fleet';
import type { Truck } from '../core/types';
import { getVehicleModel } from '../data/vehicles';
import { getWorld } from '../data/worlds';
import { currentLanguage } from '../i18n';
import { formatGameTime, formatKurus, formatNumber } from '../i18n/format';
import { useGameStore, useSelectedTruck } from '../store/gameStore';
import { driverName, modelLabel, truckStatus } from './fleetText';
import { cityName } from './names';
import { TruckDrawing } from './TruckDrawing';
import { useDuration } from './useDuration';

function ConditionBar({ value }: { value: number }) {
  const { t } = useTranslation();
  const tone = value < BALANCE.minConditionForJobs ? 'neg' : value < 50 ? 'warn' : 'pos';
  return (
    <span className="condition" title={t('fleet.condition')}>
      <span className="bar-track">
        <span className={`bar ${tone}`} style={{ width: `${value}%` }} />
      </span>
      <span>{Math.floor(value)}%</span>
    </span>
  );
}

export function FleetPanel({ onOpenBoard }: { onOpenBoard: () => void }) {
  const { t } = useTranslation();
  const worldId = useGameStore((s) => s.worldId);
  const trucks = useGameStore((s) => s.trucks);
  const trailers = useGameStore((s) => s.trailers);
  const selected = useSelectedTruck();
  const select = useGameStore((s) => s.selectTruck);
  const lang = currentLanguage();
  const now = useGameStore((s) => s.clock.time);
  if (!worldId || !selected) return null;

  return (
    <div className="fleet">
      <ul className="fleet-list" aria-label={t('fleet.list')}>
        {trucks.map((truck) => (
          <li key={truck.id}>
            <button
              type="button"
              aria-pressed={truck.id === selected.id}
              onClick={() => select(truck.id)}
            >
              <span className="plate">{truck.plate}</span>
              <span className="fleet-item">
                <strong>{modelLabel(t, truck.modelId)}</strong>
                <small>{truckStatus(t, worldId, truck)}</small>
              </span>
              <ConditionBar value={truck.condition} />
            </button>
          </li>
        ))}
      </ul>
      <TruckDetail truck={selected} worldId={worldId} onOpenBoard={onOpenBoard} />
      {trailers.length > 0 && (
        <section className="fleet-section">
          <h3>{t('fleet.trailers')}</h3>
          <ul className="rows">
            {trailers.map((trailer) => {
              const tractor = trucks.find((tr) => tr.id === trailer.truckId);
              const price = trailerValue(trailer, now);
              return (
                <li key={trailer.id}>
                  <span>
                    <strong>{t(`body.${trailer.kind}`)}</strong>
                    <small>
                      {tractor
                        ? t('fleet.trailerOn', { plate: tractor.plate })
                        : t('fleet.trailerAt', { city: cityName(worldId, trailer.cityId) })}
                    </small>
                  </span>
                  <SendButton
                    disabled={!!tractor}
                    confirm={t('fleet.sellConfirm', {
                      what: t(`body.${trailer.kind}`),
                      price: formatKurus(price, lang),
                    })}
                    command={{ type: 'sellTrailer', trailerId: trailer.id }}
                  >
                    {t('fleet.sellFor', { price: formatKurus(price, lang) })}
                  </SendButton>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Komut gönderen düğme; isteğe bağlı onay sorar. */
export function SendButton({
  command,
  confirm,
  disabled,
  title,
  className,
  children,
}: {
  command: Parameters<ReturnType<typeof useGameStore.getState>['send']>[0];
  confirm?: string;
  disabled?: boolean;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const send = useGameStore((s) => s.send);
  return (
    <button
      type="button"
      className={className ?? 'secondary'}
      disabled={disabled}
      title={title}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        send(command);
      }}
    >
      {children}
    </button>
  );
}

function TruckDetail({
  truck,
  worldId,
  onOpenBoard,
}: {
  truck: Truck;
  worldId: string;
  onOpenBoard: () => void;
}) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const duration = useDuration();
  const now = useGameStore((s) => s.clock.time);
  const money = useGameStore((s) => s.money);
  const trucks = useGameStore((s) => s.trucks);
  const trailers = useGameStore((s) => s.trailers);
  const drivers = useGameStore((s) => s.drivers);
  const send = useGameStore((s) => s.send);
  const fleet = { trucks, trailers, drivers };
  const model = getVehicleModel(truck.modelId);
  const spec = truckSpec(fleet, truck);
  const trailer = trailerOf(fleet, truck);
  const trip = truck.trip;
  const busy = trip !== null || truck.serviceUntil !== null;
  const city = (id: string) => cityName(worldId, id);
  const p = trip ? tripProgress(getWorld(worldId), truck, now, model.speedFactor) : null;
  const when = (minutes: number) =>
    `${t('clock.day', { day: Math.floor(minutes / MINUTES_PER_DAY) + 1 })}, ${formatGameTime(minutes, lang)}`;
  const late = trip && p ? p.eta > trip.job.deadline : false;
  const quote = serviceQuote(truck);
  const value = truckValue(truck, now);
  const freeTrailers = trailers.filter((r) => !r.truckId && r.cityId === truck.cityId);
  const eligible = drivers.filter((d) => licenseCovers(d.license, model.license));

  return (
    <section className="truck" aria-label={truck.plate}>
      <TruckDrawing
        modelId={truck.modelId}
        body={spec.body}
        label={t('fleet.drawing', { model: model.name })}
      />
      <div className="truck-head">
        <span className="plate">{truck.plate}</span>
        <div>
          <strong>{model.name}</strong>
          <small>
            {t('vehicle.class', { n: model.vehicleClass })} · {t(`tier.${model.tier}`)} ·{' '}
            {t('vehicle.license', { license: model.license })}
          </small>
        </div>
      </div>
      <p className="truck-status" aria-live="polite">
        {truckStatus(t, worldId, truck)}
        {truck.serviceUntil !== null &&
          ` · ${t('fleet.serviceLeft', { duration: duration(truck.serviceUntil - now) })}`}
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
        <dt>{t('fleet.driver')}</dt>
        <dd>
          <select
            value={truck.driverId ?? ''}
            disabled={busy}
            aria-label={t('fleet.driver')}
            onChange={(e) => {
              const id = e.target.value;
              if (id) send({ type: 'assignDriver', driverId: id, truckId: truck.id });
              else if (truck.driverId) {
                send({ type: 'assignDriver', driverId: truck.driverId, truckId: null });
              }
            }}
          >
            <option value="">{t('fleet.noDriver')}</option>
            {eligible.map((d) => {
              const on = trucks.find((tr) => tr.driverId === d.id && tr.id !== truck.id);
              return (
                <option
                  key={d.id}
                  value={d.id}
                  disabled={!!on && (!!on.trip || on.serviceUntil !== null)}
                >
                  {driverName(t, d)} ({d.license}){on ? ` · ${on.plate}` : ''}
                </option>
              );
            })}
          </select>
        </dd>
        <dt>{model.tractor ? t('fleet.trailer') : t('fleet.body')}</dt>
        <dd>{spec.body ? t(`body.${spec.body}`) : t('fleet.noTrailer')}</dd>
        <dt>{t('truck.capacity')}</dt>
        <dd>{t('units.tons', { tons: formatNumber(model.capacityTons, lang, 1) })}</dd>
        <dt>{t('fleet.fuel')}</dt>
        <dd>{t('units.per100', { l: formatNumber(spec.fuelPer100Km, lang, 1) })}</dd>
        <dt>{t('fleet.condition')}</dt>
        <dd>
          <ConditionBar value={truck.condition} />
        </dd>
        <dt>{t('truck.odometer')}</dt>
        <dd>{t('units.km', { km: formatNumber(truck.odometerKm, lang) })}</dd>
        <dt>{t('fleet.value')}</dt>
        <dd>{formatKurus(value, lang)}</dd>
      </dl>
      {truck.condition < BALANCE.minConditionForJobs && truck.serviceUntil === null && (
        <p className="job-warn">{t('acceptError.needsService')}</p>
      )}
      {model.tractor && (
        <div className="actions">
          {trailer ? (
            <SendButton disabled={busy} command={{ type: 'detachTrailer', truckId: truck.id }}>
              {t('fleet.detach', { kind: t(`body.${trailer.kind}`) })}
            </SendButton>
          ) : freeTrailers.length === 0 ? (
            <p className="muted">{t('fleet.noFreeTrailer', { city: city(truck.cityId) })}</p>
          ) : null}
          {freeTrailers.map((r) => (
            <SendButton
              key={r.id}
              disabled={busy}
              command={{ type: 'attachTrailer', truckId: truck.id, trailerId: r.id }}
            >
              {t('fleet.attach', { kind: t(`body.${r.kind}`) })}
            </SendButton>
          ))}
        </div>
      )}
      <div className="actions">
        {!trip && truck.serviceUntil === null && (
          <button type="button" className="primary" onClick={onOpenBoard}>
            {t('truck.goToBoard')}
          </button>
        )}
        <SendButton
          disabled={busy || quote.minutes === 0 || money < quote.cost}
          title={money < quote.cost ? t('commandError.noMoney') : undefined}
          command={{ type: 'serviceTruck', truckId: truck.id }}
        >
          {quote.minutes === 0
            ? t('fleet.serviceNotNeeded')
            : t('fleet.service', {
                cost: formatKurus(quote.cost, lang),
                duration: duration(quote.minutes),
              })}
        </SendButton>
        <SendButton
          disabled={busy || trucks.length === 1}
          title={trucks.length === 1 ? t('commandError.lastTruck') : undefined}
          confirm={t('fleet.sellConfirm', {
            what: `${truck.plate} ${model.name}`,
            price: formatKurus(value, lang),
          })}
          command={{ type: 'sellTruck', truckId: truck.id }}
        >
          {t('fleet.sellFor', { price: formatKurus(value, lang) })}
        </SendButton>
      </div>
    </section>
  );
}
