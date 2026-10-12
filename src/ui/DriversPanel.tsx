import { useTranslation } from 'react-i18next';
import { BALANCE, MINUTES_PER_DAY } from '../core/balance';
import { currentLanguage } from '../i18n';
import { monthlyPayroll } from '../core/fleet';
import { formatKurus } from '../i18n/format';
import { useGameStore } from '../store/gameStore';
import { SendButton } from './FleetPanel';
import { driverName } from './fleetText';
import { useDuration } from './useDuration';

export function DriversPanel() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const duration = useDuration();
  const drivers = useGameStore((s) => s.drivers);
  const candidates = useGameStore((s) => s.candidates);
  const trucks = useGameStore((s) => s.trucks);
  const now = useGameStore((s) => s.clock.time);
  const manager = useGameStore((s) => s.manager);
  const payroll = monthlyPayroll({ drivers, manager });
  const period = BALANCE.marketRefreshDays * MINUTES_PER_DAY;
  const nextRefresh = period - (now % period);

  return (
    <div className="drivers">
      <ManagerSection />
      <section className="fleet-section">
        <h3>{t('drivers.staff')}</h3>
        <ul className="rows">
          {drivers.map((d) => {
            const truck = trucks.find((tr) => tr.driverId === d.id);
            return (
              <li key={d.id}>
                <span>
                  <strong>{driverName(t, d)}</strong>
                  <small>
                    {t('drivers.summary', { license: d.license, level: d.level })} ·{' '}
                    {truck ? truck.plate : t('drivers.unassigned')}
                    {d.salary > 0 &&
                      ` · ${t('drivers.salary', { amount: formatKurus(d.salary, lang) })}`}
                  </small>
                </span>
                {!d.isPlayer && (
                  <SendButton
                    disabled={!!truck && (!!truck.trip || truck.serviceUntil !== null)}
                    confirm={t('drivers.fireConfirm', { name: d.name })}
                    command={{ type: 'fireDriver', driverId: d.id }}
                  >
                    {t('drivers.fire')}
                  </SendButton>
                )}
              </li>
            );
          })}
        </ul>
        <p className="muted">
          {t('drivers.payroll', { amount: formatKurus(payroll, lang) })}
          <br />
          {t('drivers.licenseHint')}
        </p>
      </section>
      <section className="fleet-section">
        <h3>{t('drivers.candidates')}</h3>
        <p className="muted">{t('drivers.nextRefresh', { duration: duration(nextRefresh) })}</p>
        {candidates.length === 0 ? (
          <p className="empty">{t('drivers.noCandidates')}</p>
        ) : (
          <ul className="rows">
            {candidates.map((c) => (
              <li key={c.id}>
                <span>
                  <strong>{c.name}</strong>
                  <small>
                    {t('drivers.summary', { license: c.license, level: c.level })} ·{' '}
                    {t('drivers.salary', { amount: formatKurus(c.salary, lang) })}
                  </small>
                </span>
                <SendButton className="primary" command={{ type: 'hireDriver', candidateId: c.id }}>
                  {t('drivers.hire')}
                </SendButton>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Filo müdürü: işe al, görevi aç/kapat, çıkar. */
function ManagerSection() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const manager = useGameStore((s) => s.manager);
  const trucks = useGameStore((s) => s.trucks);
  const send = useGameStore((s) => s.send);
  const rules = t('manager.rules', {
    min: formatKurus(BALANCE.managerMinProfit, lang),
    reserve: formatKurus(BALANCE.managerCashReserve, lang),
    below: BALANCE.managerServiceBelow,
  });

  return (
    <section className="fleet-section">
      <h3>{t('manager.title')}</h3>
      {manager ? (
        <>
          <ul className="rows">
            <li>
              <span>
                <strong>{manager.name}</strong>
                <small>{t('drivers.salary', { amount: formatKurus(manager.salary, lang) })}</small>
              </span>
              <SendButton
                confirm={t('manager.fireConfirm', { name: manager.name })}
                command={{ type: 'fireManager' }}
              >
                {t('drivers.fire')}
              </SendButton>
            </li>
          </ul>
          <label className="check-row">
            <input
              type="checkbox"
              checked={manager.active}
              onChange={(e) => send({ type: 'setManagerActive', active: e.target.checked })}
            />
            <span>
              {t('manager.onDuty')}
              <small>{t('manager.onDutyHint')}</small>
            </span>
          </label>
          <p className="muted">
            {t('manager.count', {
              count: trucks.filter((tr) => tr.managed).length,
              total: trucks.length,
            })}
            <br />
            {rules}
          </p>
        </>
      ) : (
        <>
          <p className="muted">
            {t('manager.pitch')}
            <br />
            {rules}
          </p>
          <div className="actions">
            <SendButton className="primary" command={{ type: 'hireManager' }}>
              {t('manager.hire', { amount: formatKurus(BALANCE.managerSalary, lang) })}
            </SendButton>
          </div>
        </>
      )}
    </section>
  );
}
