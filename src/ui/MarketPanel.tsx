import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BALANCE, MINUTES_PER_DAY } from '../core/balance';
import { BODY_KINDS, RIGID_BODIES, type BodyKind } from '../core/types';
import { newTruckPrice, TRAILER_PRICES, VEHICLE_MODELS } from '../data/vehicles';
import { getWorld } from '../data/worlds';
import { currentLanguage } from '../i18n';
import { formatKurus, formatNumber } from '../i18n/format';
import { useGameStore, useSelectedTruck } from '../store/gameStore';
import { SendButton } from './FleetPanel';
import {
  NEW_SORT_KEYS,
  readMarketSort,
  sortMarket,
  USED_SORT_KEYS,
  writeMarketSort,
  type MarketSort,
} from './marketSort';
import { cityName } from './names';
import { TruckDrawing } from './TruckDrawing';

const MINUTES_PER_YEAR = 365 * MINUTES_PER_DAY;

export function MarketPanel() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const worldId = useGameStore((s) => s.worldId);
  const money = useGameStore((s) => s.money);
  const listings = useGameStore((s) => s.usedListings);
  const now = useGameStore((s) => s.clock.time);
  const selected = useSelectedTruck();
  const [cityId, setCityId] = useState<string>(selected?.cityId ?? BALANCE.startCityId);
  const [bodies, setBodies] = useState<Record<string, BodyKind>>({});
  const [usedSort, setUsedSort] = useState(() => readMarketSort('used', USED_SORT_KEYS));
  const [newSort, setNewSort] = useState(() => readMarketSort('new', NEW_SORT_KEYS));
  if (!worldId) return null;
  const cities = [...getWorld(worldId).cities].sort((a, b) => a.name.localeCompare(b.name, lang));
  const price = (amount: number) => formatKurus(amount, lang);
  const noMoney = (amount: number) => (money < amount ? t('commandError.noMoney') : undefined);
  const bodyOf = (modelId: string, tractor: boolean) =>
    tractor ? null : (bodies[modelId] ?? 'tenteli');
  const sortedListings = sortMarket(
    listings,
    (l) => {
      const m = VEHICLE_MODELS.find((model) => model.id === l.modelId)!;
      return { ...m, id: l.id, price: l.price, condition: l.condition, builtAt: l.builtAt };
    },
    usedSort,
  );
  const sortedModels = sortMarket(
    VEHICLE_MODELS,
    (m) => ({ ...m, price: newTruckPrice(m, bodyOf(m.id, m.tractor)) }),
    newSort,
  );

  return (
    <div className="market">
      <section className="fleet-section">
        <h3>{t('market.used')}</h3>
        <p className="muted">{t('market.usedHint')}</p>
        {listings.length === 0 ? (
          <p className="empty">{t('market.noUsed')}</p>
        ) : (
          <>
            <SortBar
              keys={USED_SORT_KEYS}
              sort={usedSort}
              onChange={(next) => {
                setUsedSort(next);
                writeMarketSort('used', next);
              }}
            />
            <ul className="cards">
              {sortedListings.map((l) => {
                const model = VEHICLE_MODELS.find((m) => m.id === l.modelId)!;
                const years = Math.max(0, Math.round((now - l.builtAt) / MINUTES_PER_YEAR));
                return (
                  <li key={l.id} className="card">
                    <TruckDrawing modelId={l.modelId} body={l.body} label={model.name} />
                    <strong>
                      {model.name} · {t('vehicle.class', { n: model.vehicleClass })}
                    </strong>
                    <small>
                      {l.body ? t(`body.${l.body}`) : t('market.tractor')} ·{' '}
                      {t('units.tons', { tons: formatNumber(model.capacityTons, lang, 1) })} ·{' '}
                      {t('vehicle.license', { license: model.license })}
                    </small>
                    <small>
                      {t('market.age', { years })} ·{' '}
                      {t('units.km', { km: formatNumber(l.odometerKm, lang) })} ·{' '}
                      {t('market.conditionShort', { value: l.condition })} ·{' '}
                      {cityName(worldId, l.cityId)}
                    </small>
                    <SendButton
                      className="primary"
                      disabled={money < l.price}
                      title={noMoney(l.price)}
                      confirm={t('market.buyConfirm', { what: model.name, price: price(l.price) })}
                      command={{ type: 'buyUsedTruck', listingId: l.id }}
                    >
                      {t('market.buyFor', { price: price(l.price) })}
                    </SendButton>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section className="fleet-section">
        <h3>{t('market.new')}</h3>
        <label className="truck-picker">
          <span>{t('market.deliverTo')}</span>
          <select value={cityId} onChange={(e) => setCityId(e.target.value)}>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <SortBar
          keys={NEW_SORT_KEYS}
          sort={newSort}
          onChange={(next) => {
            setNewSort(next);
            writeMarketSort('new', next);
          }}
        />
        <ul className="cards">
          {sortedModels.map((model) => {
            const body = bodyOf(model.id, model.tractor);
            const cost = newTruckPrice(model, body);
            return (
              <li key={model.id} className="card">
                <TruckDrawing modelId={model.id} body={body} label={model.name} />
                <strong>
                  {model.name} · {t('vehicle.class', { n: model.vehicleClass })} ·{' '}
                  {t(`tier.${model.tier}`)}
                </strong>
                <small>
                  {t('units.tons', { tons: formatNumber(model.capacityTons, lang, 1) })} ·{' '}
                  {t('units.per100', { l: formatNumber(model.fuelPer100Km, lang, 1) })} ·{' '}
                  {t('vehicle.license', { license: model.license })}
                  {model.tractor && ` · ${t('market.needsTrailer')}`}
                </small>
                {!model.tractor && (
                  <select
                    aria-label={t('fleet.body')}
                    value={body ?? 'tenteli'}
                    onChange={(e) =>
                      setBodies({ ...bodies, [model.id]: e.target.value as BodyKind })
                    }
                  >
                    {RIGID_BODIES.map((b) => (
                      <option key={b} value={b}>
                        {t(`body.${b}`)}
                      </option>
                    ))}
                  </select>
                )}
                <SendButton
                  className="primary"
                  disabled={money < cost}
                  title={noMoney(cost)}
                  confirm={t('market.buyConfirm', { what: model.name, price: price(cost) })}
                  command={{ type: 'buyNewTruck', modelId: model.id, body, cityId }}
                >
                  {t('market.buyFor', { price: price(cost) })}
                </SendButton>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="fleet-section">
        <h3>{t('market.trailers')}</h3>
        <p className="muted">{t('market.trailersHint')}</p>
        <ul className="rows">
          {BODY_KINDS.map((kind) => (
            <li key={kind}>
              <span>
                <strong>{t(`body.${kind}`)}</strong>
                <small>{t(`market.trailerUse.${kind}`)}</small>
              </span>
              <SendButton
                className="primary"
                disabled={money < TRAILER_PRICES[kind]}
                title={noMoney(TRAILER_PRICES[kind])}
                confirm={t('market.buyConfirm', {
                  what: t(`body.${kind}`),
                  price: price(TRAILER_PRICES[kind]),
                })}
                command={{ type: 'buyTrailer', kind, cityId }}
              >
                {t('market.buyFor', { price: price(TRAILER_PRICES[kind]) })}
              </SendButton>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SortBar<K extends string>({
  keys,
  sort,
  onChange,
}: {
  keys: readonly K[];
  sort: MarketSort<K>;
  onChange: (sort: MarketSort<K>) => void;
}) {
  const { t } = useTranslation();
  const desc = sort.dir === 'desc';
  return (
    <div className="sort-bar">
      <label>
        <span>{t('market.sortBy')}</span>
        <select value={sort.key} onChange={(e) => onChange({ ...sort, key: e.target.value as K })}>
          {keys.map((k) => (
            <option key={k} value={k}>
              {t(`market.sort.${k}`)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="secondary"
        aria-label={t(desc ? 'market.sortDesc' : 'market.sortAsc')}
        title={t(desc ? 'market.sortDesc' : 'market.sortAsc')}
        onClick={() => onChange({ ...sort, dir: desc ? 'asc' : 'desc' })}
      >
        {desc ? '↓' : '↑'} {t(`market.sortDir.${sort.key}.${sort.dir}`)}
      </button>
    </div>
  );
}
