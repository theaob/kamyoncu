import type { CargoType } from '../core/types';

/**
 * Kamyonetle taşınabilen yük türleri (Faz 1). Adlar çeviri dosyalarındadır: `cargo.<id>`.
 * Ödeme formülü ve değerler için bkz. plan 3.6 ve 7; Faz 1 denge testlerinde ayarlanacak.
 */
export const CARGO_TYPES: readonly CargoType[] = [
  { id: 'parcels', ratePerKm: 1800, tons: [0.4, 1.2], frequency: 5, urgency: 1.1 },
  { id: 'textiles', ratePerKm: 1900, tons: [0.6, 1.5], frequency: 3, urgency: 1 },
  { id: 'food', ratePerKm: 2000, tons: [0.8, 1.5], frequency: 4, urgency: 1.15 },
  { id: 'spareParts', ratePerKm: 2200, tons: [0.3, 1.0], frequency: 3, urgency: 1.2 },
  { id: 'electronics', ratePerKm: 2600, tons: [0.3, 0.9], frequency: 2, urgency: 1.1 },
  { id: 'pharma', ratePerKm: 3000, tons: [0.2, 0.6], frequency: 1, urgency: 1.4 },
];

const BY_ID = new Map(CARGO_TYPES.map((c) => [c.id, c]));

export function getCargo(id: string): CargoType {
  const cargo = BY_ID.get(id);
  if (!cargo) throw new Error(`Bilinmeyen yük türü: ${id}`);
  return cargo;
}
