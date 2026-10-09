/**
 * Dal önizlemeleri aynı kökte (GitHub Pages) yayınlanır; her dal kendi kayıt
 * yuvasını kullansın diye CI VITE_SAVE_NAMESPACE verir. Asıl sürümde boştur.
 */
const NAMESPACE = import.meta.env.VITE_SAVE_NAMESPACE
  ? `.${import.meta.env.VITE_SAVE_NAMESPACE}`
  : '';

/** Otomatik kayıt yuvası. Depolama kapalıysa (gizli sekme vb.) oyun kayıtsız sürer. */
export const SAVE_KEY = `kamyoncu.save${NAMESPACE}`;
/** Yüklenemeyen kayıt, üzerine yazılmadan önce buraya taşınır. */
export const SAVE_BACKUP_KEY = `${SAVE_KEY}.backup`;

/** Oyuncu tercihi: ilgi isteyen olayda otomatik duraklat. Varsayılan açık. */
const AUTO_PAUSE_KEY = 'kamyoncu.autoPause';

export function readAutoPause(): boolean {
  try {
    return localStorage.getItem(AUTO_PAUSE_KEY) !== '0';
  } catch {
    return true;
  }
}

export function writeAutoPause(on: boolean): void {
  try {
    localStorage.setItem(AUTO_PAUSE_KEY, on ? '1' : '0');
  } catch {
    // Depolama kapalıysa tercih yalnızca bu oturumda geçerli olur.
  }
}

export function readSave(): string | null {
  try {
    return localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
}

export function writeSave(data: string): boolean {
  try {
    localStorage.setItem(SAVE_KEY, data);
    return true;
  } catch {
    return false;
  }
}

export function backupSave(): void {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (data !== null) localStorage.setItem(SAVE_BACKUP_KEY, data);
  } catch {
    // Yedek alınamazsa yapacak bir şey yok; yeni oyun yine başlar.
  }
}
