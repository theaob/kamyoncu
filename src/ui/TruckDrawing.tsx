import { useMemo } from 'react';
import type { BodyKind } from '../core/types';
import { getVehicleModel } from '../data/vehicles';
import { drawTruck } from './truckArt';

/** Garaj ekranındaki yan görünüm çizimi. */
export function TruckDrawing({
  modelId,
  body,
  label,
}: {
  modelId: string;
  body: BodyKind | null;
  label: string;
}) {
  const art = useMemo(() => drawTruck(getVehicleModel(modelId), body), [modelId, body]);
  return (
    <svg
      className="truck-art"
      viewBox={art.viewBox}
      role="img"
      aria-label={label}
      // Çizim sabit sayılardan üretilir; kullanıcı metni içermez.
      dangerouslySetInnerHTML={{ __html: art.markup }}
    />
  );
}
