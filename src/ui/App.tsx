import { useTranslation } from 'react-i18next';
import { MapView } from '../map/MapView';
import { useGameStore } from '../store/gameStore';
import { EventLog } from './EventLog';
import { TopBar } from './TopBar';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

export function App() {
  const { t } = useTranslation();
  const worldId = useGameStore((s) => s.worldId);
  useKeyboardShortcuts();

  return (
    <div className="app">
      <TopBar />
      <main className="stage">
        {worldId ? <MapView worldId={worldId} /> : <p className="loading">{t('app.loading')}</p>}
        <EventLog />
      </main>
    </div>
  );
}
