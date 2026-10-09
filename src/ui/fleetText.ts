import type { TFunction } from 'i18next';
import type { Driver, Truck } from '../core/types';
import { getVehicleModel } from '../data/vehicles';
import { cityName } from './names';

/** Aracın tek satırlık durumu: boşta, bakımda ya da işin hangi aşamasında. */
export function truckStatus(t: TFunction, worldId: string | null, truck: Truck): string {
  const city = (id: string) => cityName(worldId, id);
  if (truck.serviceUntil !== null) return t('truck.status.service', { city: city(truck.cityId) });
  const trip = truck.trip;
  if (!trip) return t('truck.status.idle', { city: city(truck.cityId) });
  const target =
    trip.phase === 'toPickup' || trip.phase === 'loading' ? trip.job.from : trip.job.to;
  return t(`truck.status.${trip.phase}`, { city: city(target) });
}

/** "Bozkır 35 · Sınıf 1" gibi. Model adı özel addır, çevrilmez. */
export function modelLabel(t: TFunction, modelId: string): string {
  const model = getVehicleModel(modelId);
  return `${model.name} · ${t('vehicle.class', { n: model.vehicleClass })}`;
}

/** Oyuncunun kendisi adsız kaydedilir; "Siz" olarak gösterilir. */
export function driverName(t: TFunction, driver: Driver): string {
  return driver.isPlayer ? t('drivers.you') : driver.name;
}
