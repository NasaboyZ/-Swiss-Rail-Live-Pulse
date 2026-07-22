import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapContext } from './MapContext';
import styles from './map.module.css';

// Free, no-API-key CARTO Positron style — clean white basemap,
// ideal for overlaying transit data (similar to railOscope's vector canvas).
const CARTO_POSITRON = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/**
 * Base MapLibre GL wrapper — follows the mapcn Map component API.
 *
 * Children are only rendered once the map style has loaded (`ready` state).
 * This prevents child layer effects from firing before the map is usable.
 *
 * @param {[number, number]} center  [longitude, latitude] — MapLibre order
 * @param {number}           zoom    Initial zoom level
 * @param {string}           style   MapLibre style URL (defaults to CARTO Positron)
 */
export function Map({ center = [8.54, 47.37], zoom = 7.5, style, children }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: style || CARTO_POSITRON,
      center,
      zoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = map;

    map.on('load', () => setReady(true));

    // Resize the map whenever the container changes dimensions.
    // This handles the case where the map is hidden with display:none (0×0)
    // and then revealed — the ResizeObserver fires and map.resize() makes the
    // canvas fill the container correctly.
    const ro = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.resize();
    });
    ro.observe(containerRef.current);

    // React StrictMode fires effects twice — the cleanup removes the first map
    // so the second run creates a fresh, correct instance.
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MapContext.Provider value={mapRef.current}>
      <div ref={containerRef} className={styles.container} />
      {/* Only render children (layers, markers) after the map style has loaded */}
      {ready && children}
    </MapContext.Provider>
  );
}
