/**
 * Otomatik kayıt yuvası. Depolama kapalıysa (gizli sekme vb.) oyun kayıtsız sürer.
 * Dal önizlemeleri aynı kökte (GitHub Pages) yayınlandığı için bu yuvayı paylaşır:
 * oyuncu ilerlemesini dallar arasında taşır.
 */
export const SAVE_KEY = 'kamyoncu.save';
/** Yüklenemeyen kayıt, üzerine yazılmadan önce buraya taşınır. */
export const SAVE_BACKUP_KEY = `${SAVE_KEY}.backup`;
/** Eski önizlemeler dala özel yuva kullanıyordu: `kamyoncu.save.<dal>`. */
const LEGACY_PREFIX = `${SAVE_KEY}.`;

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
    return localStorage.getItem(SAVE_KEY) ?? readLegacySave();
  } catch {
    return null;
  }
}

/**
 * Ortak yuva boşsa dala özel eski kayıtlardan en ilerisini (önce sürüm, sonra oyun
 * zamanı) devralır. Eski anahtarlar silinmez; ilk otomatik kayıt ortak yuvaya yazar.
 */
function readLegacySave(): string | null {
  let best: { data: string; version: number; time: number } | null = null;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(LEGACY_PREFIX) || key === SAVE_BACKUP_KEY || key.endsWith('.backup')) {
      continue;
    }
    const data = localStorage.getItem(key);
    if (data === null) continue;
    let version = 0;
    let time = 0;
    try {
      const parsed = JSON.parse(data) as { version?: unknown; time?: unknown };
      if (typeof parsed.version === 'number') version = parsed.version;
      if (typeof parsed.time === 'number') time = parsed.time;
    } catch {
      continue;
    }
    if (!best || version > best.version || (version === best.version && time > best.time)) {
      best = { data, version, time };
    }
  }
  return best?.data ?? null;
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
