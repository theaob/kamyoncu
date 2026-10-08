/**
 * Tohumlu, deterministik rastgele sayı üreteci (mulberry32).
 * Durum tek bir 32 bit tamsayıdır; oyun durumuyla birlikte kaydedilir.
 */
export function nextRandom(state: number): [value: number, nextState: number] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** Durumu nesne içinde tutan kullanım kolaylığı. */
export class Rng {
  constructor(public state: number) {}

  next(): number {
    const [value, next] = nextRandom(this.state);
    this.state = next;
    return value;
  }

  /** [min, max] aralığında tamsayı. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}

/** RNG durumunu oyun durumunda tutar; böylece kayıttan devam eden oyun aynı sırayı izler. */
export function withRng<T>(state: { rngState: number }, fn: (rng: Rng) => T): T {
  const rng = new Rng(state.rngState);
  const result = fn(rng);
  state.rngState = rng.state;
  return result;
}

export function pickWeighted<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let r = rng.next() * total;
  for (const item of items) {
    r -= weight(item);
    if (r < 0) return item;
  }
  return items[items.length - 1]!;
}
