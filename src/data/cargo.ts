import type { CargoType } from '../core/types';

const TL = 100;

/**
 * Yük türleri (plan 3.5). Adlar çeviri dosyalarındadır: `cargo.<id>`.
 * Ödeme: taban + km × (km fiyatı + ton × ton-km fiyatı) × aciliyet × talep (plan 3.6).
 * Değerler ilk tahmindir; oyun testleriyle ayarlanacak.
 */
const c = (
  id: string,
  body: CargoType['body'],
  tons: [number, number],
  rate: number,
  perTon: number,
  frequency: number,
  urgency: number,
): CargoType => ({
  id,
  body,
  tons,
  ratePerKm: rate * TL,
  ratePerTonKm: perTon * TL,
  frequency,
  urgency,
});

export const CARGO_TYPES: readonly CargoType[] = [
  c('parcels', 'tenteli', [0.2, 2], 15, 1.8, 5, 1.1),
  c('textiles', 'tenteli', [0.5, 12], 14, 1.6, 3, 1),
  c('spareParts', 'tenteli', [0.3, 6], 17, 1.8, 3, 1.2),
  c('electronics', 'tenteli', [0.3, 10], 20, 1.9, 2, 1.1),
  c('whiteGoods', 'tenteli', [1, 14], 15, 1.6, 2, 1),
  c('furniture', 'tenteli', [1, 16], 14, 1.6, 2, 1),
  c('construction', 'tenteli', [6, 25], 12, 1.5, 2, 0.95),
  c('grain', 'tenteli', [8, 25], 11, 1.6, 2, 0.9),
  c('food', 'frigorifik', [0.5, 20], 17, 1.8, 4, 1.15),
  c('pharma', 'frigorifik', [0.2, 4], 24, 2.4, 1, 1.4),
  c('frozen', 'frigorifik', [2, 24], 18, 1.8, 2, 1.15),
  c('fuel', 'tanker', [15, 25], 16, 1.8, 2, 1.1),
  c('chemicals', 'tanker', [8, 24], 18, 2, 1, 1.1),
  c('containers', 'konteyner', [10, 25], 13, 1.6, 2, 1),
];

const BY_ID = new Map(CARGO_TYPES.map((cargo) => [cargo.id, cargo]));

export function getCargo(id: string): CargoType {
  const cargo = BY_ID.get(id);
  if (!cargo) throw new Error(`Bilinmeyen yük türü: ${id}`);
  return cargo;
}
