import { useTranslation } from 'react-i18next';
import { MINUTES_PER_DAY } from '../core/balance';
import { SPEEDS } from '../core/types';
import { currentLanguage, setLanguage } from '../i18n';
import { formatGameDate, formatGameTime } from '../i18n/format';
import { isLang, LANGUAGES } from '../i18n/languages';
import { useGameStore } from '../store/gameStore';
import { APP_VERSION } from '../version';

export function TopBar() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const clock = useGameStore((s) => s.clock);
  const send = useGameStore((s) => s.send);
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

      <label className="lang">
        <span>{t('language.label')}</span>
        <select
          id="language"
          value={lang}
          onChange={(e) => {
            if (isLang(e.target.value)) setLanguage(e.target.value);
          }}
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {t(`language.${l}`)}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}
