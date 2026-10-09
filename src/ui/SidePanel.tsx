import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DriversPanel } from './DriversPanel';
import { FinancePanel } from './FinancePanel';
import { FleetPanel } from './FleetPanel';
import { JobBoard } from './JobBoard';
import { PANEL_TABS, useGameStore } from '../store/gameStore';
import { MarketPanel } from './MarketPanel';

export function SidePanel() {
  const { t } = useTranslation();
  const tab = useGameStore((s) => s.panelTab);
  const setTab = useGameStore((s) => s.setPanelTab);
  // Dikey ekranda panel yarım ekran; tutamaçla büyütülüp haritaya yer açılır.
  const [expanded, setExpanded] = useState(false);

  return (
    <aside className={expanded ? 'side expanded' : 'side'} aria-label={t('panel.label')}>
      <button
        type="button"
        className="panel-grip"
        aria-expanded={expanded}
        aria-label={expanded ? t('panel.shrink') : t('panel.expand')}
        title={expanded ? t('panel.shrink') : t('panel.expand')}
        onClick={() => setExpanded((e) => !e)}
      />
      <div className="tabs" role="tablist">
        {PANEL_TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`tabpanel-${id}`}
            onClick={() => setTab(id)}
          >
            {t(`panel.${id}`)}
          </button>
        ))}
      </div>
      <div
        className="tabpanel"
        role="tabpanel"
        id={`tabpanel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'jobs' && <JobBoard />}
        {tab === 'fleet' && <FleetPanel onOpenBoard={() => setTab('jobs')} />}
        {tab === 'drivers' && <DriversPanel />}
        {tab === 'market' && <MarketPanel />}
        {tab === 'finance' && <FinancePanel />}
      </div>
    </aside>
  );
}
