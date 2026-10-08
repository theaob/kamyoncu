import type { VehicleModel } from '../core/types';

/** Araç modelleri. Faz 1'de yalnızca oyuncunun ikinci el kamyoneti var; pazar Faz 2'de. */
export const VEHICLE_MODELS: readonly VehicleModel[] = [
  { id: 'van-used', vehicleClass: 1, capacityTons: 1.5, fuelPer100Km: 11 },
];

const BY_ID = new Map(VEHICLE_MODELS.map((m) => [m.id, m]));

export function getVehicleModel(id: string): VehicleModel {
  const model = BY_ID.get(id);
  if (!model) throw new Error(`Bilinmeyen araç modeli: ${id}`);
  return model;
}
