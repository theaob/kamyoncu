import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getWorld } from '../data/worlds';
import { MapRenderer } from './MapRenderer';

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
    void renderer.init();
    return () => {
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
