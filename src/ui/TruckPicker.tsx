import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/gameStore';
import { modelLabel } from './fleetText';

/** Seçili aracı değiştiren açılır liste; tek araç varsa gizlenir. */
export function TruckPicker() {
  const { t } = useTranslation();
  const trucks = useGameStore((s) => s.trucks);
  const selected = useGameStore((s) => s.selectedTruckId);
  const select = useGameStore((s) => s.selectTruck);
  if (trucks.length < 2) return null;
  return (
    <label className="truck-picker">
      <span>{t('fleet.vehicle')}</span>
      <select value={selected ?? ''} onChange={(e) => select(e.target.value)}>
        {trucks.map((truck) => (
          <option key={truck.id} value={truck.id}>
            {truck.plate} · {modelLabel(t, truck.modelId)}
            {truck.trip || truck.serviceUntil !== null ? ` · ${t('fleet.busy')}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
