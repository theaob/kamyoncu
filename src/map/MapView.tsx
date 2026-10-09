import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { findRoute, truckPosition } from '../core/routing';
import { getWorld } from '../data/worlds';
import { useGameStore } from '../store/gameStore';
import { modelLabel, truckStatus } from '../ui/fleetText';
import { MapRenderer, type MapOverlay } from './MapRenderer';

type OverlayInput = Pick<
  ReturnType<typeof useGameStore.getState>,
  'trucks' | 'jobs' | 'highlightJobId' | 'selectedTruckId'
>;

/** Store durumundan harita katmanını üretir. Rotalar yalnızca değişince yeniden hesaplanır. */
function makeOverlayBuilder(worldId: string) {
  const world = getWorld(worldId);
  let routeKey = '';
  let routes: Omit<MapOverlay, 'trucks'> = {
    activeRoute: null,
    previewEmpty: null,
    previewLoaded: null,
  };
  return ({ trucks, jobs, highlightJobId, selectedTruckId }: OverlayInput): MapOverlay => {
    const truck = trucks.find((t) => t.id === selectedTruckId) ?? trucks[0];
    const trip = truck?.trip ?? null;
    const preview = highlightJobId ? jobs.find((j) => j.id === highlightJobId) : undefined;
    const key = [
      truck?.id ?? '',
      trip ? `${trip.job.id}:${trip.phase}:${trip.route.join('-')}` : '',
      truck && preview ? `${trip?.job.to ?? truck.cityId}:${preview.id}` : '',
    ].join('|');
    if (key !== routeKey) {
      routeKey = key;
      let activeRoute: string[] | null = null;
      if (trip) {
        const rest = trip.route.slice(trip.leg);
        const loaded =
          trip.phase === 'toPickup' || trip.phase === 'loading'
            ? (findRoute(world, trip.job.from, trip.job.to)?.cities ?? [])
            : [];
        activeRoute =
          trip.phase === 'toPickup'
            ? [...rest, ...loaded.slice(1)]
            : trip.phase === 'loading'
              ? loaded
              : rest;
      }
      routes = {
        activeRoute,
        // Seçili araç yoldaysa bir sonraki iş teslim şehrinden başlar (yük borsası tahminleriyle aynı).
        previewEmpty:
          truck && preview
            ? (findRoute(world, trip?.job.to ?? truck.cityId, preview.from)?.cities ?? null)
            : null,
        previewLoaded: preview
          ? (findRoute(world, preview.from, preview.to)?.cities ?? null)
          : null,
      };
    }
    // Aynı şehirde bekleyen araçlar üst üste binmesin diye sıralanır.
    const seen = new Map<string, number>();
    return {
      ...routes,
      trucks: trucks.map((t) => {
        const pos = truckPosition(world, t);
        const key = `${Math.round(pos.x)}:${Math.round(pos.y)}`;
        const stack = seen.get(key) ?? 0;
        seen.set(key, stack + 1);
        return { id: t.id, ...pos, selected: t === truck, stack };
      }),
    };
  };
}

/** Seçim listesinin genişliği ve dokunulan noktaya uzaklığı (piksel). */
const CHOOSER_WIDTH = 260;
const CHOOSER_GAP = 18;

/** Aynı yerdeki birden çok araca dokunulunca açılan küçük seçim listesi. */
interface Choice {
  ids: string[];
  x: number;
  y: number;
  /** Harita alanının boyutu; liste kenardan taşmasın diye. */
  width: number;
  height: number;
}

export function MapView({ worldId }: { worldId: string }) {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const label = t('map.label');
  const [choice, setChoice] = useState<Choice | null>(null);
  const closeChoice = useCallback(() => setChoice(null), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = new MapRenderer(host, getWorld(worldId));
    rendererRef.current = renderer;
    const build = makeOverlayBuilder(worldId);
    const sync = () => renderer.setOverlay(build(useGameStore.getState()));
    renderer.setPickHandler((ids, at) => {
      if (ids.length === 1) useGameStore.getState().pickTruck(ids[0]!);
      setChoice(
        ids.length > 1 ? { ids, ...at, width: host.clientWidth, height: host.clientHeight } : null,
      );
    });
    void renderer.init().then(sync);
    sync();
    // Kamyon konumu her tikte değişir; React'i yeniden çizdirmeden doğrudan haritaya aktar.
    const unsubscribe = useGameStore.subscribe(sync);
    return () => {
      unsubscribe();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [worldId]);

  useEffect(() => {
    rendererRef.current?.setAriaLabel(label);
  }, [label]);

  return (
    <div className="map">
      <div
        className="map-canvas"
        ref={hostRef}
        // Haritayı kaydırınca/yakınlaştırınca liste yerinden kayar; kapat.
        onPointerDown={closeChoice}
        onWheel={closeChoice}
      />
      {choice && <TruckChooser worldId={worldId} choice={choice} onClose={closeChoice} />}
      <div className="map-controls" role="group" aria-label={t('map.label')}>
        <button
          type="button"
          onClick={() => rendererRef.current?.zoomBy(1.4)}
          aria-label={t('map.zoomIn')}
          title={t('map.zoomIn')}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => rendererRef.current?.zoomBy(1 / 1.4)}
          aria-label={t('map.zoomOut')}
          title={t('map.zoomOut')}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => rendererRef.current?.reset()}
          aria-label={t('map.reset')}
          title={t('map.reset')}
        >
          ⌖
        </button>
      </div>
      <ul className="map-legend">
        <li>
          <span className="swatch otoyol" />
          {t('map.legend.otoyol')}
        </li>
        <li>
          <span className="swatch devlet" />
          {t('map.legend.devlet')}
        </li>
      </ul>
    </div>
  );
}

function TruckChooser({
  worldId,
  choice,
  onClose,
}: {
  worldId: string;
  choice: Choice;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const trucks = useGameStore((s) => s.trucks);
  const selectedId = useGameStore((s) => s.selectedTruckId);
  const pick = useGameStore((s) => s.pickTruck);
  const listRef = useRef<HTMLDivElement>(null);
  const options = choice.ids.flatMap((id) => trucks.find((tr) => tr.id === id) ?? []);

  useEffect(() => {
    listRef.current?.querySelector('button')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choice, onClose]);

  if (options.length === 0) return null;
  // Listeyi dokunulan noktanın yanına koy; harita kenarından taşmasın.
  const { width, height } = choice;
  const half = Math.min(CHOOSER_WIDTH, width - 16) / 2;
  const left = Math.min(Math.max(choice.x - half, 8), width - 2 * half - 8);
  // Üst yarıda dokunulduysa altına, alt yarıda üstüne açılır.
  const place =
    choice.y < height / 2
      ? { top: choice.y + CHOOSER_GAP, maxHeight: height - choice.y - CHOOSER_GAP - 8 }
      : { bottom: height - choice.y + CHOOSER_GAP, maxHeight: choice.y - CHOOSER_GAP - 8 };

  return (
    <div
      ref={listRef}
      className="map-chooser"
      style={{ left, width: 2 * half, ...place }}
      role="dialog"
      aria-label={t('map.chooseVehicle')}
    >
      {options.map((truck) => (
        <button
          key={truck.id}
          type="button"
          aria-pressed={truck.id === selectedId}
          onClick={() => {
            pick(truck.id);
            onClose();
          }}
        >
          <span className="plate">{truck.plate}</span>
          <span className="fleet-item">
            <strong>{modelLabel(t, truck.modelId)}</strong>
            <small>{truckStatus(t, worldId, truck)}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
