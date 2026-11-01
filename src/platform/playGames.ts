import { Capacitor, registerPlugin } from '@capacitor/core';
import { useGameStore } from '../store/gameStore';
import {
  earnedAchievements,
  leaderboardScores,
  LEADERBOARDS,
  type AchievementKey,
  type LeaderboardKey,
} from './playProgress';

/**
 * Google Play Games Services köprüsü (yalnızca Android).
 * Yerel tarafı: android/app/src/main/java/io/github/theaob/kamyoncu/PlayGamesPlugin.java.
 * Web'de ve Play Games kimlikleri tanımlanmamış derlemelerde hiçbir şey yapmaz.
 * Kurulum: docs/PLAY_GAMES.md
 */
interface PlayGamesStatus {
  /** Uygulama kimliği tanımlı ve SDK başlatıldı. */
  available: boolean;
  signedIn: boolean;
}

interface PlayGamesPlugin {
  status(): Promise<PlayGamesStatus>;
  signIn(): Promise<PlayGamesStatus>;
  unlockAchievement(options: { key: AchievementKey }): Promise<{ sent: boolean }>;
  submitScore(options: { key: LeaderboardKey; score: number }): Promise<{ sent: boolean }>;
  showAchievements(): Promise<void>;
  showLeaderboards(): Promise<void>;
}

/** Skorlar en sık bu aralıkla gönderilir (Play Games de toplu gönderir, gereksiz trafik olmasın). */
const SCORE_INTERVAL_MS = 60_000;

export const isPlayGamesPlatform = Capacitor.getPlatform() === 'android';

const plugin = isPlayGamesPlatform ? registerPlugin<PlayGamesPlugin>('PlayGames') : null;

export interface PlayGamesState {
  available: boolean;
  signedIn: boolean;
}

type Listener = (state: PlayGamesState) => void;

let state: PlayGamesState = { available: false, signedIn: false };
const listeners = new Set<Listener>();

function setState(next: PlayGamesStatus) {
  state = { available: next.available, signedIn: next.available && next.signedIn };
  listeners.forEach((l) => l(state));
}

export function getPlayGamesState(): PlayGamesState {
  return state;
}

export function subscribePlayGames(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Bu oturumda gönderilen başarımlar; Play Games yinelenen açmaları zaten yok sayar. */
const unlocked = new Set<AchievementKey>();
const lastScores = new Map<LeaderboardKey, number>();
let lastScoreAt = 0;

function reportAchievements() {
  if (!plugin || !state.signedIn) return;
  for (const key of earnedAchievements(useGameStore.getState())) {
    if (unlocked.has(key)) continue;
    unlocked.add(key);
    plugin.unlockAchievement({ key }).catch(() => unlocked.delete(key));
  }
}

function reportScores(force = false) {
  if (!plugin || !state.signedIn) return;
  const now = Date.now();
  if (!force && now - lastScoreAt < SCORE_INTERVAL_MS) return;
  lastScoreAt = now;
  const scores = leaderboardScores(useGameStore.getState());
  for (const key of LEADERBOARDS) {
    const score = scores[key];
    if (score <= 0 || score === lastScores.get(key)) continue;
    lastScores.set(key, score);
    plugin.submitScore({ key, score }).catch(() => lastScores.delete(key));
  }
}

function report(force = false) {
  if (!useGameStore.getState().ready) return;
  reportAchievements();
  reportScores(force);
}

/** Uygulama açılınca bir kez çağrılır. Android dışında hiçbir şey yapmaz. */
export function startPlayGames(): void {
  if (!plugin) return;
  plugin
    .status()
    .then((s) => {
      setState(s);
      report(true);
    })
    .catch(() => setState({ available: false, signedIn: false }));
  // Para ve filo her tikte gelir; kurallar ucuz, gönderimler yukarıda süzülür.
  useGameStore.subscribe(() => report());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') report(true);
  });
}

export async function playGamesSignIn(): Promise<void> {
  if (!plugin) return;
  setState(await plugin.signIn());
  report(true);
}

export async function showAchievements(): Promise<void> {
  await plugin?.showAchievements();
}

export async function showLeaderboards(): Promise<void> {
  await plugin?.showLeaderboards();
}
