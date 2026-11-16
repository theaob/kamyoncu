import { describe, expect, it } from 'vitest';
import type { BodyKind } from '../src/core/types';
import { VEHICLE_MODELS } from '../src/data/vehicles';
import { averageBot, type BotResult } from './helpers/balanceBot';

const REPORT = process.env.BALANCE_REPORT === '1';
const SEEDS = REPORT ? [7919, 15838, 23757, 31676] : [7919, 15838, 23757];
const DAYS = REPORT ? 60 : 40;

function configs(): [string, BodyKind][] {
  const out: [string, BodyKind][] = [];
  for (const m of VEHICLE_MODELS) {
    const bodies: BodyKind[] = m.tractor
      ? ['tenteli', 'frigorifik', 'tanker', 'konteyner']
      : ['tenteli', 'frigorifik'];
    for (const b of bodies) if (REPORT || m.tier === 'standard') out.push([m.id, b]);
  }
  return out;
}

describe('araç ilerlemesi dengesi (bot)', () => {
  const results = new Map<string, BotResult>();
  for (const [id, body] of configs())
    results.set(`${id}/${body}`, averageBot(id, body, SEEDS, DAYS));
  const get = (key: string) => results.get(key)!;

  if (REPORT) {
    const rows = [...results].map(([key, r]) => ({
      vehicle: key,
      'net ₺/day': Math.round(r.netPerDay),
      'idle %': Math.round(r.idleShare * 100),
      'km/day': Math.round(r.kmPerDay),
      'loaded %': Math.round(r.loadedShare * 100),
      'fill %': Math.round(r.loadFactor * 100),
      'jobs/day': Number(r.jobsPerDay.toFixed(2)),
      'price M₺': Number((r.price / 1e6).toFixed(2)),
      'payback d': Math.round(r.paybackDays),
    }));
    // Vitest geçen testlerin konsol çıktısını gizleyebilir; doğrudan stdout'a yazılır.
    process.stdout.write(`\n${rows.map((r) => Object.values(r).join('\t')).join('\n')}\n`);
    process.stdout.write(`${Object.keys(rows[0]!).join('\t')}\n`);
  }

  it('her sınıf bir alttakinden belirgin biçimde fazla kazanır', () => {
    const ladder = ['c1', 'c2', 'c3', 'c4', 'c6'].map(
      (c) => get(`${c}-standard/tenteli`).netPerDay,
    );
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i]!).toBeGreaterThan(ladder[i - 1]! * 1.1);
    }
  });

  it('hiçbir dorse türü tuzak değil: her tır, en büyük kamyondan fazla kazanır', () => {
    const rigid = get('c4-standard/tenteli').netPerDay;
    for (const body of ['tenteli', 'frigorifik', 'tanker', 'konteyner']) {
      expect(get(`c6-standard/${body}`).netPerDay).toBeGreaterThan(rigid);
    }
  });

  it('büyük araç kendini makul sürede öder (kamyonetin en çok 2,5 katı)', () => {
    const van = get('c1-standard/tenteli').paybackDays;
    for (const [key, r] of results) {
      if (!key.includes('-standard/')) continue;
      expect(r.paybackDays).toBeGreaterThan(0);
      expect(r.paybackDays).toBeLessThan(van * 2.5);
    }
  });
});
