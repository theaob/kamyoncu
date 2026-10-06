import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.theaob.kamyoncu',
  appName: 'Kamyoncu',
  webDir: 'dist',
  android: {
    // Oyun tamamen yerel çalışır; harici içerik yüklenmez.
    allowMixedContent: false,
  },
};

export default config;
