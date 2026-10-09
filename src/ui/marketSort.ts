/**
 * Pazar listelerinin sıralaması. Seçim cihaz başına saklanır (kayıt dosyasında değil),
 * oyuncu her açılışta aynı sırayı görsün diye.
 */

export type SortDir = 'asc' | 'desc';

export const USED_SORT_KEYS = ['price', 'capacity', 'fuel', 'condition', 'age'] as const;
export const NEW_SORT_KEYS = ['price', 'capacity', 'fuel'] as const;

export type UsedSortKey = (typeof USED_SORT_KEYS)[number];
export type NewSortKey = (typeof NEW_SORT_KEYS)[number];
export type MarketSortKey = UsedSortKey;

export interface MarketSort<K extends string = MarketSortKey> {
  key: K;
  dir: SortDir;
}

/** Sıralanacak bir ilan veya modelin karşılaştırılan değerleri. */
export interface SortFields {
  id: string;
  price: number;
  vehicleClass: number;
  capacityTons: number;
  fuelPer100Km: number;
  /** Yalnızca ikinci el. */
  condition?: number;
  /** Yalnızca ikinci el: üretim anı; büyük değer = daha genç araç. */
  builtAt?: number;
}

/** Her anahtar için "artan" yönündeki karşılaştırma. */
function compareBy(key: MarketSortKey, a: SortFields, b: SortFields): number {
  switch (key) {
    case 'price':
      return a.price - b.price;
    case 'capacity':
      return a.vehicleClass - b.vehicleClass || a.capacityTons - b.capacityTons;
    case 'fuel':
      return a.fuelPer100Km - b.fuelPer100Km;
    case 'condition':
      return (a.condition ?? 0) - (b.condition ?? 0);
    case 'age':
      // Artan yaş: önce en yeni araç.
      return (b.builtAt ?? 0) - (a.builtAt ?? 0);
  }
}

/** Kararlı sıralama: eşitlikte ucuz olan, sonra kimlik öne geçer (yönden bağımsız). */
export function sortMarket<T>(
  items: readonly T[],
  fields: (item: T) => SortFields,
  sort: MarketSort<string>,
): T[] {
  const key = sort.key as MarketSortKey;
  const sign = sort.dir === 'desc' ? -1 : 1;
  return items
    .map((item) => ({ item, f: fields(item) }))
    .sort(
      (a, b) =>
        sign * compareBy(key, a.f, b.f) || a.f.price - b.f.price || a.f.id.localeCompare(b.f.id),
    )
    .map((x) => x.item);
}

const STORAGE_PREFIX = 'kamyoncu.marketSort.';

export function readMarketSort<K extends string>(
  list: 'used' | 'new',
  keys: readonly K[],
): MarketSort<K> {
  const fallback: MarketSort<K> = { key: keys[0]!, dir: 'asc' };
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + list);
    if (!raw) return fallback;
    const [key, dir] = raw.split(':');
    if (!keys.includes(key as K) || (dir !== 'asc' && dir !== 'desc')) return fallback;
    return { key: key as K, dir };
  } catch {
    return fallback;
  }
}

export function writeMarketSort(list: 'used' | 'new', sort: MarketSort<string>): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + list, `${sort.key}:${sort.dir}`);
  } catch {
    // Depolama kapalıysa seçim yalnızca bu oturumda geçerli olur.
  }
}
