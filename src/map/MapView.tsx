import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { findRoute, truckPosition } from '../core/routing';
import { getWorld } from '../data/worlds';
import { useGameStore } from '../store/gameStore';
import { MapRenderer, type MapOverlay } from './MapRenderer';

type OverlayInput = Pick<
  ReturnType<typeof useGameStore.getState>,
  'trucks' | 'jobs' | 'highlightJobId'
>;

/** Store durumundan harita katmanını üretir. Rotalar yalnızca değişince yeniden hesaplanır. */
function makeOverlayBuilder(worldId: string) {
  const world = getWorld(worldId);
  let routeKey = '';
  let routes: Omit<MapOverlay, 'truck'> = {
    activeRoute: null,
    previewEmpty: null,
    previewLoaded: null,
  };
  return ({ trucks, jobs, highlightJobId }: OverlayInput): MapOverlay => {
    const truck = trucks[0];
    const trip = truck?.trip ?? null;
    const preview = highlightJobId ? jobs.find((j) => j.id === highlightJobId) : undefined;
    const key = [
      trip ? `${trip.job.id}:${trip.phase}:${trip.route.join('-')}` : '',
      truck && preview ? `${truck.cityId}:${preview.id}` : '',
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
        previewEmpty:
          truck && preview ? (findRoute(world, truck.cityId, preview.from)?.cities ?? null) : null,
        previewLoaded: preview
          ? (findRoute(world, preview.from, preview.to)?.cities ?? null)
          : null,
      };
    }
    return { ...routes, truck: truck ? truckPosition(world, truck) : null };
  };
}

export function MapView({ worldId }: { worldId: string }) {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const label = t('map.label');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = new MapRenderer(host, getWorld(worldId));
    rendererRef.current = renderer;
    const build = makeOverlayBuilder(worldId);
    const sync = () => renderer.setOverlay(build(useGameStore.getState()));
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
      <div className="map-canvas" ref={hostRef} />
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
