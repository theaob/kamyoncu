import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { currentLanguage, setLanguage } from '../i18n';
import { formatGameTime } from '../i18n/format';
import { isLang, LANGUAGES } from '../i18n/languages';
import { useGameStore } from '../store/gameStore';
import { APP_VERSION } from '../version';

/** Üst bardaki ☰ düğmesi: dil, kayıt durumu ve yeni oyun burada durur. */
export function GameMenu() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const savedAt = useGameStore((s) => s.savedAt);
  const saveFailed = useGameStore((s) => s.saveFailed);
  const newGame = useGameStore((s) => s.newGame);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="menu-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('menu.open')}
        title={t('menu.open')}
        onClick={() => setOpen(true)}
      >
        ☰
      </button>
      <dialog
        ref={dialogRef}
        className="menu"
        aria-labelledby="menu-title"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Arka plana dokunmak menüyü kapatır.
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div className="menu-body">
          <header className="menu-head">
            <h2 id="menu-title">{t('menu.title')}</h2>
            <button
              type="button"
              className="menu-close"
              aria-label={t('menu.close')}
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </header>

          <label className="menu-row">
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

          <p className="menu-row save-status" aria-live="polite">
            {saveFailed
              ? t('app.notSaved')
              : savedAt !== null
                ? t('app.saved', { time: formatGameTime(savedAt, lang) })
                : t('menu.notSavedYet')}
          </p>

          <button
            type="button"
            className="menu-danger"
            onClick={() => {
              if (window.confirm(t('app.newGameConfirm'))) {
                newGame();
                setOpen(false);
              }
            }}
          >
            {t('app.newGame')}
          </button>

          <p className="menu-version">
            {t('app.title')} {APP_VERSION}
          </p>
        </div>
      </dialog>
    </>
  );
}
