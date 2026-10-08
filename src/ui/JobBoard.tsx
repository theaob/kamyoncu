import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { estimateJob, tripProgress, type JobEstimate } from '../core/economy';
import type { Job } from '../core/types';
import { getVehicleModel } from '../data/vehicles';
import { getWorld } from '../data/worlds';
import { currentLanguage } from '../i18n';
import { formatKurus, formatNumber } from '../i18n/format';
import { useGameStore } from '../store/gameStore';
import { cityName } from './names';
import { useDuration } from './useDuration';

type Filter = 'here' | 'all';
type Sort = 'profit' | 'perHour' | 'deadline';

interface Row {
  job: Job;
  est: JobEstimate;
  perHour: number;
}

export function JobBoard() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const duration = useDuration();
  const worldId = useGameStore((s) => s.worldId);
  const jobs = useGameStore((s) => s.jobs);
  const truck = useGameStore((s) => s.trucks[0]);
  const now = useGameStore((s) => s.clock.time);
  const send = useGameStore((s) => s.send);
  const setHighlight = useGameStore((s) => s.setHighlightJob);
  const highlight = useGameStore((s) => s.highlightJobId);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('profit');

  const rows = useMemo<Row[]>(() => {
    if (!worldId || !truck) return [];
    const world = getWorld(worldId);
    const model = getVehicleModel(truck.modelId);
    // Kamyon yoldaysa tahminler teslimattan sonrası içindir: teslim şehrinden, teslim anından.
    const base = truck.trip
      ? { city: truck.trip.job.to, time: tripProgress(world, truck, now)!.eta }
      : { city: truck.cityId, time: now };
    const out: Row[] = [];
    for (const job of jobs) {
      if (filter === 'here' && job.from !== base.city) continue;
      const est = estimateJob(world, model, base.city, job, base.time);
      if (!est) continue;
      const hours = Math.max((est.eta - base.time) / 60, 0.5);
      out.push({ job, est, perHour: est.profit / hours });
    }
    const key: Record<Sort, (r: Row) => number> = {
      profit: (r) => -r.est.profit,
      perHour: (r) => -r.perHour,
      deadline: (r) => r.job.deadline,
    };
    return out.sort((a, b) => key[sort](a) - key[sort](b));
  }, [worldId, truck, jobs, filter, sort, now]);

  if (!truck) return null;
  const capacity = getVehicleModel(truck.modelId).capacityTons;
  const trip = truck.trip;
  const busy = trip !== null;

  return (
    <div className="jobs">
      <div className="jobs-controls">
        <label>
          <span>{t('jobs.filter.label')}</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="all">{t('jobs.filter.all')}</option>
            <option value="here">{t('jobs.filter.here')}</option>
          </select>
        </label>
        <label>
          <span>{t('jobs.sort.label')}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="profit">{t('jobs.sort.profit')}</option>
            <option value="perHour">{t('jobs.sort.perHour')}</option>
            <option value="deadline">{t('jobs.sort.deadline')}</option>
          </select>
        </label>
        <span className="jobs-count">{t('jobs.count', { count: rows.length })}</span>
      </div>
      {trip && (
        <p className="jobs-note" role="status">
          {t('jobs.busyNotice', { city: cityName(worldId, trip.job.to) })}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="empty">{t('jobs.empty')}</p>
      ) : (
        <ul className="job-list" onMouseLeave={() => setHighlight(null)}>
          {rows.map(({ job, est, perHour }) => {
            const from = cityName(worldId, job.from);
            const to = cityName(worldId, job.to);
            const tooHeavy = job.tons > capacity;
            return (
              <li
                key={job.id}
                className={['job', highlight === job.id && 'highlighted', busy && 'locked']
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => setHighlight(job.id)}
                onFocus={() => setHighlight(job.id)}
              >
                <div className="job-route">
                  <strong>
                    {from} → {to}
                  </strong>
                  <span className="job-cargo">
                    {t(`cargo.${job.cargo}`)} ·{' '}
                    {t('units.tons', { tons: formatNumber(job.tons, lang, 1) })}
                  </span>
                </div>
                <div className="job-meta">
                  <span>{t('units.km', { km: formatNumber(est.km, lang) })}</span>
                  <span>
                    {est.emptyKm > 0
                      ? t('jobs.emptyLeg', { km: formatNumber(est.emptyKm, lang) })
                      : t('jobs.noEmptyLeg')}
                  </span>
                  <span>{t('jobs.deadlineIn', { duration: duration(job.deadline - now) })}</span>
                </div>
                <div className="job-money">
                  <span>
                    {t('jobs.pay')} <b>{formatKurus(job.pay, lang)}</b>
                  </span>
                  <span className={est.profit >= 0 ? 'pos' : 'neg'}>
                    {t('jobs.profit')} <b>{formatKurus(est.profit, lang)}</b>
                    <small>{t('jobs.perHour', { amount: formatKurus(perHour, lang) })}</small>
                  </span>
                </div>
                {est.penalty > 0 && (
                  <p className="job-warn">
                    {t('jobs.lateRisk', { penalty: formatKurus(est.penalty, lang) })}
                  </p>
                )}
                {!busy && (
                  <button
                    type="button"
                    className="accept"
                    disabled={tooHeavy}
                    title={tooHeavy ? t('jobs.tooHeavy') : t('jobs.acceptTitle', { from, to })}
                    aria-label={t('jobs.acceptTitle', { from, to })}
                    onClick={() => {
                      send({ type: 'acceptJob', jobId: job.id, truckId: truck.id });
                      setHighlight(null);
                    }}
                  >
                    {t('jobs.accept')}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
