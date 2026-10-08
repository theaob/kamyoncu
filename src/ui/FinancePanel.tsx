import { useTranslation } from 'react-i18next';
import { MINUTES_PER_DAY } from '../core/balance';
import { LEDGER_CATEGORIES, type LedgerCategory, type Money } from '../core/types';
import { currentLanguage } from '../i18n';
import { formatKurus } from '../i18n/format';
import { useGameStore } from '../store/gameStore';

type Amounts = Record<LedgerCategory, Money>;

function sum(list: Amounts[]): Amounts {
  const out = { freight: 0, fuel: 0, tolls: 0, penalties: 0 };
  for (const a of list) for (const c of LEDGER_CATEGORIES) out[c] += a[c];
  return out;
}

const net = (a: Amounts) => LEDGER_CATEGORIES.reduce((s, c) => s + a[c], 0);

export function FinancePanel() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const finance = useGameStore((s) => s.finance);
  const today = Math.floor(useGameStore((s) => s.clock.time) / MINUTES_PER_DAY);

  const columns: [string, Amounts][] = [
    ['finance.today', sum(finance.days.filter((d) => d.day === today).map((d) => d.amounts))],
    ['finance.week', sum(finance.days.filter((d) => d.day > today - 7).map((d) => d.amounts))],
    ['finance.total', finance.totals],
  ];
  const recent = finance.days.slice(-7);
  const maxAbs = Math.max(1, ...recent.map((d) => Math.abs(net(d.amounts))));
  const tone = (v: number) => (v < 0 ? 'neg' : v > 0 ? 'pos' : undefined);

  return (
    <div className="finance">
      <table>
        <thead>
          <tr>
            <th scope="col" />
            {columns.map(([key]) => (
              <th key={key} scope="col">
                {t(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LEDGER_CATEGORIES.map((c) => (
            <tr key={c}>
              <th scope="row">{t(`finance.category.${c}`)}</th>
              {columns.map(([key, a]) => (
                <td key={key} className={tone(a[c])}>
                  {formatKurus(a[c], lang)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{t('finance.net')}</th>
            {columns.map(([key, a]) => (
              <td key={key} className={tone(net(a))}>
                {formatKurus(net(a), lang)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
      <p className="muted">
        {t('finance.deliveries', {
          count: finance.deliveries,
          late: finance.lateDeliveries,
        })}
      </p>
      {recent.length > 0 && (
        <>
          <h3>{t('finance.byDay')}</h3>
          <ul className="bars">
            {recent.map((d) => {
              const v = net(d.amounts);
              return (
                <li key={d.day}>
                  <span>{t('finance.dayN', { day: d.day + 1 })}</span>
                  <span className="bar-track">
                    <span
                      className={v < 0 ? 'bar neg' : 'bar pos'}
                      style={{ width: `${(Math.abs(v) / maxAbs) * 100}%` }}
                    />
                  </span>
                  <span className={v < 0 ? 'neg' : 'pos'}>{formatKurus(v, lang)}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
