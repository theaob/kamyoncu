/** CI'da VITE_APP_VERSION ile verilir (ör. 0.1.0-build.42); yerelde "dev". */
export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION || 'dev';
