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
