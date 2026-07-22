import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from './MapContext';

/**
 * Adds MapLibre navigation controls (zoom +/-, compass reset) to the map.
 * Position defaults to top-right to match the mapcn MapControls placement.
 */
export function MapControls({ position = 'top-right' }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const nav = new maplibregl.NavigationControl({ visualizePitch: false });
    map.addControl(nav, position);
    return () => map.removeControl(nav);
  }, [map, position]);

  return null;
}
