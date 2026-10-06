import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Yazı tipleri pakete gömülür: Android uygulaması çevrimdışı da çalışmalı.
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
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
