import { describe, expect, it } from 'vitest';
import { sortMarket, type SortFields } from '../src/ui/marketSort';

const items: SortFields[] = [
  {
    id: 'a',
    price: 300,
    vehicleClass: 3,
    capacityTons: 10,
    fuelPer100Km: 22,
    condition: 50,
    builtAt: 100,
  },
  {
    id: 'b',
    price: 100,
    vehicleClass: 1,
    capacityTons: 1.5,
    fuelPer100Km: 11,
    condition: 90,
    builtAt: 300,
  },
  {
    id: 'c',
    price: 200,
    vehicleClass: 6,
    capacityTons: 25,
    fuelPer100Km: 32,
    condition: 70,
    builtAt: 200,
  },
  {
    id: 'd',
    price: 150,
    vehicleClass: 3,
    capacityTons: 10,
    fuelPer100Km: 22,
    condition: 70,
    builtAt: 200,
  },
];
const ids = (key: string, dir: 'asc' | 'desc') =>
  sortMarket(items, (x) => x, { key, dir }).map((x) => x.id);

describe('pazar sıralaması', () => {
  it('fiyata göre artan ve azalan', () => {
    expect(ids('price', 'asc')).toEqual(['b', 'd', 'c', 'a']);
    expect(ids('price', 'desc')).toEqual(['a', 'c', 'd', 'b']);
  });

  it('sınıf/kapasite, eşitlikte ucuz olan önde', () => {
    expect(ids('capacity', 'asc')).toEqual(['b', 'd', 'a', 'c']);
    expect(ids('capacity', 'desc')).toEqual(['c', 'd', 'a', 'b']);
  });

  it('yakıt, durum ve yaş', () => {
    expect(ids('fuel', 'asc')).toEqual(['b', 'd', 'a', 'c']);
    expect(ids('condition', 'desc')).toEqual(['b', 'd', 'c', 'a']);
    expect(ids('age', 'asc')).toEqual(['b', 'd', 'c', 'a']);
    expect(ids('age', 'desc')).toEqual(['a', 'd', 'c', 'b']);
  });

  it('girdiyi değiştirmez', () => {
    const before = items.map((x) => x.id);
    ids('price', 'desc');
    expect(items.map((x) => x.id)).toEqual(before);
  });
});
