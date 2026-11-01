import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/sim';
import {
  ACHIEVEMENTS,
  earnedAchievements,
  LEADERBOARDS,
  leaderboardScores,
} from '../src/platform/playProgress';

const TL = 100;

describe('Play Games başarımları', () => {
  it('yeni oyunda hiçbir başarım kazanılmamış', () => {
    expect(earnedAchievements(createInitialState(1))).toEqual([]);
  });

  it('koşullar sağlanınca kazanılır', () => {
    const s = createInitialState(1);
    s.finance.deliveries = 100;
    s.money = 1_000_000 * TL;
    s.manager = { name: 'x', salary: 0, active: true };
    s.drivers = [...s.drivers, { ...s.drivers[0]!, id: 'd2', isPlayer: false }];
    s.trucks = Array.from({ length: 5 }, (_, i) => ({ ...s.trucks[0]!, id: `t${i}` }));
    expect(earnedAchievements(s).sort()).toEqual([...ACHIEVEMENTS].sort());
  });

  it('skorlar kariyer gelirini ve teslimat sayısını verir', () => {
    const s = createInitialState(1);
    s.finance.deliveries = 7;
    s.finance.totals.freight = 123_456;
    expect(leaderboardScores(s)).toEqual({ career_revenue: 123_456, deliveries: 7 });
  });

  it('her anahtarın Android kaynak dosyasında yeri var', () => {
    const xml = readFileSync('android/app/src/main/res/values/games-ids.xml', 'utf8');
    const names = [...xml.matchAll(/<string name="([a-z0-9_]+)"/g)].map((m) => m[1]).sort();
    const expected = [
      'app_id',
      ...ACHIEVEMENTS.map((k) => `achievement_${k}`),
      ...LEADERBOARDS.map((k) => `leaderboard_${k}`),
    ].sort();
    expect(names).toEqual(expected);
  });
});
