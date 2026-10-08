import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';

export function LoadErrorBanner() {
  const { t } = useTranslation();
  const error = useGameStore((s) => s.loadError);
  const dismiss = useGameStore((s) => s.dismissLoadError);
  if (!error) return null;
  return (
    <div className="banner" role="alert">
      <span>{t(`save.loadError.${error}`)}</span>
      <button type="button" onClick={dismiss}>
        {t('save.dismiss')}
      </button>
    </div>
  );
}
