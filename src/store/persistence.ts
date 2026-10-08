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
