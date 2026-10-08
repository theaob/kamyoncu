import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FinancePanel } from './FinancePanel';
import { JobBoard } from './JobBoard';
import { TruckPanel } from './TruckPanel';

const TABS = ['jobs', 'truck', 'finance'] as const;
type Tab = (typeof TABS)[number];

export function SidePanel() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('jobs');

  return (
    <aside className="side" aria-label={t('panel.label')}>
      <div className="tabs" role="tablist">
        {TABS.map((id) => (
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
        {tab === 'truck' && <TruckPanel onOpenBoard={() => setTab('jobs')} />}
        {tab === 'finance' && <FinancePanel />}
      </div>
    </aside>
  );
}
