import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getPlayGamesState,
  isPlayGamesPlatform,
  playGamesSignIn,
  showAchievements,
  showLeaderboards,
  subscribePlayGames,
} from '../platform/playGames';

/** Menüde Google Play Games satırı. Yalnızca Play Games yapılandırılmış Android derlemesinde görünür. */
export function PlayGamesMenu() {
  const { t } = useTranslation();
  const pg = useSyncExternalStore(subscribePlayGames, getPlayGamesState);
  if (!isPlayGamesPlatform || !pg.available) return null;

  if (!pg.signedIn) {
    return (
      <div className="menu-row menu-play-games">
        <span>{t('playGames.title')}</span>
        <button type="button" onClick={() => void playGamesSignIn().catch(() => {})}>
          {t('playGames.signIn')}
        </button>
      </div>
    );
  }

  return (
    <div className="menu-row menu-play-games">
      <span>{t('playGames.title')}</span>
      <span className="menu-play-games-actions">
        <button type="button" onClick={() => void showAchievements().catch(() => {})}>
          {t('playGames.achievements')}
        </button>
        <button type="button" onClick={() => void showLeaderboards().catch(() => {})}>
          {t('playGames.leaderboards')}
        </button>
      </span>
    </div>
  );
}
