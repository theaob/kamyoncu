import type { GameView } from '../worker/protocol';

/**
 * Google Play Games başarımları ve skor tabloları için oyun kuralları.
 * Saf işlevler: hangi başarımın kazanıldığına ve tablolara hangi skorun gideceğine
 * yalnızca görünür oyun durumu karar verir. Play Games'e ne zaman gönderileceği
 * playGames.ts'nin işidir.
 *
 * Anahtarlar Android tarafında `games-ids.xml` kaynak adlarına eşlenir:
 * `first_delivery` → `achievement_first_delivery`, `deliveries` → `leaderboard_deliveries`.
 * Yeni anahtar eklenirse docs/PLAY_GAMES.md ve games-ids.xml de güncellenmeli.
 */
export const ACHIEVEMENTS = [
  'first_delivery',
  'deliveries_100',
  'first_hire',
  'fleet_5',
  'fleet_manager',
  'millionaire',
] as const;
export type AchievementKey = (typeof ACHIEVEMENTS)[number];

export const LEADERBOARDS = ['career_revenue', 'deliveries'] as const;
export type LeaderboardKey = (typeof LEADERBOARDS)[number];

/** Para tamsayı kuruştur. */
const TL = 100;

export type ProgressView = Pick<GameView, 'money' | 'trucks' | 'drivers' | 'finance' | 'manager'>;

const RULES: Record<AchievementKey, (v: ProgressView) => boolean> = {
  first_delivery: (v) => v.finance.deliveries >= 1,
  deliveries_100: (v) => v.finance.deliveries >= 100,
  first_hire: (v) => v.drivers.some((d) => !d.isPlayer),
  fleet_5: (v) => v.trucks.length >= 5,
  fleet_manager: (v) => v.manager !== null,
  millionaire: (v) => v.money >= 1_000_000 * TL,
};

/** Bu durumda koşulu sağlanan başarımlar. */
export function earnedAchievements(view: ProgressView): AchievementKey[] {
  return ACHIEVEMENTS.filter((key) => RULES[key](view));
}

/**
 * Skor tablolarına gidecek değerler. Kariyer navlun geliri kuruş cinsindendir;
 * Play Console'da tablo "Currency", 2 ondalık olarak tanımlanmalı.
 */
export function leaderboardScores(view: ProgressView): Record<LeaderboardKey, number> {
  return {
    career_revenue: Math.max(0, Math.round(view.finance.totals.freight)),
    deliveries: view.finance.deliveries,
  };
}
