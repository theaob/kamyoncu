import { useTranslation } from 'react-i18next';
import { MINUTES_PER_DAY } from '../core/balance';
import { SPEEDS } from '../core/types';
import { currentLanguage } from '../i18n';
import { formatGameDate, formatGameTime, formatKurus } from '../i18n/format';
import { useGameStore } from '../store/gameStore';
import { APP_VERSION } from '../version';
import { GameMenu } from './GameMenu';

export function TopBar() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const clock = useGameStore((s) => s.clock);
  const send = useGameStore((s) => s.send);
  const money = useGameStore((s) => s.money);
  const day = Math.floor(clock.time / MINUTES_PER_DAY) + 1;

  return (
    <header className="topbar">
      <span className="brand" title={`${t('app.title')} ${APP_VERSION}`}>
        {t('app.title')}
      </span>

      <div className="clock" aria-live="off">
        <span className="clock-time">{formatGameTime(clock.time, lang)}</span>
        <span className="clock-date">
          {formatGameDate(clock.time, lang)} · {t('clock.day', { day })}
        </span>
      </div>

      <div className="cash">
        <span className="cash-label">{t('money.label')}</span>
        <span className={money < 0 ? 'cash-value neg' : 'cash-value'}>
          {formatKurus(money, lang)}
        </span>
      </div>

      <div
        className="speed"
        role="group"
        aria-label={t('speed.group')}
        title={t('speed.shortcuts')}
      >
        <button
          type="button"
          className="pause"
          aria-pressed={clock.paused}
          onClick={() => send({ type: 'togglePause' })}
        >
          {clock.paused ? `▶ ${t('speed.resume')}` : `❚❚ ${t('speed.pause')}`}
        </button>
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={!clock.paused && clock.speed === s}
            aria-label={t('speed.set', { speed: s })}
            onClick={() => send({ type: 'setSpeed', speed: s })}
          >
            {s}×
          </button>
        ))}
        {clock.paused && <span className="paused-chip">{t('clock.paused')}</span>}
      </div>

      <GameMenu />
    </header>
  );
}
