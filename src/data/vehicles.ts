import type { BodyKind, License, Tier, VehicleModel } from '../core/types';

const TL = 100;

/** Sınıf başına referans (standart seviye) değerler; plan 3.2 ve 7. */
interface ClassSpec {
  vehicleClass: VehicleModel['vehicleClass'];
  code: string;
  capacityTons: number;
  fuelPer100Km: number;
  speedFactor: number;
  tollClass: VehicleModel['tollClass'];
  license: License;
  tractor: boolean;
  price: number;
}

const CLASSES: readonly ClassSpec[] = [
  {
    vehicleClass: 1,
    code: '35',
    capacityTons: 1.5,
    fuelPer100Km: 11,
    speedFactor: 1,
    tollClass: 1,
    license: 'B',
    tractor: false,
    price: 1_300_000,
  },
  {
    vehicleClass: 2,
    code: '75',
    capacityTons: 4,
    fuelPer100Km: 16,
    speedFactor: 0.95,
    tollClass: 2,
    license: 'C1',
    tractor: false,
    price: 2_100_000,
  },
  {
    vehicleClass: 3,
    code: '180',
    capacityTons: 10,
    fuelPer100Km: 22,
    speedFactor: 0.9,
    tollClass: 2,
    license: 'C',
    tractor: false,
    price: 3_200_000,
  },
  {
    vehicleClass: 4,
    code: '260',
    capacityTons: 17,
    fuelPer100Km: 28,
    speedFactor: 0.85,
    tollClass: 3,
    license: 'C',
    tractor: false,
    price: 4_200_000,
  },
  {
    vehicleClass: 6,
    code: '440',
    capacityTons: 25,
    fuelPer100Km: 32,
    speedFactor: 0.85,
    tollClass: 4,
    license: 'CE',
    tractor: true,
    price: 5_000_000,
  },
];

/**
 * Seviye çarpanları (plan 3.2 tablo): ekonomik ucuz ama çok yakar ve çabuk yıpranır,
 * premium pahalı ama az yakar ve yavaş yıpranır. Markalar kurgusaldır.
 */
const TIER_SPECS: Record<Tier, { brand: string; price: number; fuel: number; wear: number }> = {
  economy: { brand: 'Bozkır', price: 0.8, fuel: 1.15, wear: 1.3 },
  standard: { brand: 'Ufuk', price: 1, fuel: 1, wear: 1 },
  premium: { brand: 'Kartal', price: 1.3, fuel: 0.9, wear: 0.75 },
};

/** Referans aşınma: standart araç ~25.000 km'de 100'den 0'a iner. */
const BASE_WEAR_PER_KM = 0.004;

export const VEHICLE_MODELS: readonly VehicleModel[] = CLASSES.flatMap((c) =>
  (Object.keys(TIER_SPECS) as Tier[]).map((tier) => {
    const t = TIER_SPECS[tier];
    return {
      id: `c${c.vehicleClass}-${tier}`,
      vehicleClass: c.vehicleClass,
      tier,
      name: `${t.brand} ${c.code}`,
      capacityTons: c.capacityTons,
      fuelPer100Km: Math.round(c.fuelPer100Km * t.fuel * 10) / 10,
      speedFactor: c.speedFactor,
      tollClass: c.tollClass,
      license: c.license,
      tractor: c.tractor,
      price: Math.round((c.price * t.price) / 10_000) * 10_000 * TL,
      wearPerKm: BASE_WEAR_PER_KM * t.wear,
    };
  }),
);

const BY_ID = new Map(VEHICLE_MODELS.map((m) => [m.id, m]));

export function getVehicleModel(id: string): VehicleModel {
  const model = BY_ID.get(id);
  if (!model) throw new Error(`Bilinmeyen araç modeli: ${id}`);
  return model;
}

/** Frigorifik kasa ek fiyatı (kamyonlarda), sıfır fiyata oran. */
export const REEFER_BODY_PRICE_SHARE = 0.2;
/** Frigorifik kasanın soğutma ünitesi ek yakıtı. */
export const REEFER_FUEL_FACTOR = 1.08;

/** Sıfır dorse fiyatları, kuruş (plan 3.3). */
export const TRAILER_PRICES: Record<BodyKind, number> = {
  tenteli: 650_000 * TL,
  frigorifik: 1_100_000 * TL,
  tanker: 1_000_000 * TL,
  konteyner: 550_000 * TL,
};

/** Sıfır araç fiyatı, seçilen kasayla. */
export function newTruckPrice(model: VehicleModel, body: BodyKind | null): number {
  const reefer = !model.tractor && body === 'frigorifik';
  return reefer ? Math.round(model.price * (1 + REEFER_BODY_PRICE_SHARE)) : model.price;
}
