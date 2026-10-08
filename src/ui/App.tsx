import { useTranslation } from 'react-i18next';
import { MapView } from '../map/MapView';
import { useGameStore } from '../store/gameStore';
import { EventLog } from './EventLog';
import { LoadErrorBanner } from './LoadErrorBanner';
import { SidePanel } from './SidePanel';
import { TopBar } from './TopBar';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

export function App() {
  const { t } = useTranslation();
  const worldId = useGameStore((s) => s.worldId);
  useKeyboardShortcuts();

  return (
    <div className="app">
      <TopBar />
      <LoadErrorBanner />
      <main className="stage">
        <div className="map-area">
          {worldId ? <MapView worldId={worldId} /> : <p className="loading">{t('app.loading')}</p>}
          <EventLog />
        </div>
        {worldId && <SidePanel />}
      </main>
    </div>
  );
}
