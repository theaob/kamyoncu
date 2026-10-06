import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './ui/styles.css';
import { App } from './ui/App';
import { ensureSimStarted } from './store/gameStore';

ensureSimStarted();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
