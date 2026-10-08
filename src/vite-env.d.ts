/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  /** Dal önizlemelerinde kayıt anahtarı son eki; asıl sürümde tanımsız. */
  readonly VITE_SAVE_NAMESPACE?: string;
}
