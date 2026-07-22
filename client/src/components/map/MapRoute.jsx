import { useEffect } from 'react';
import { useMap } from './MapContext';

let routeCounter = 0;

/**
 * Renders a GeoJSON LineString on the map for a train route.
 *
 * Pure effect component — renders nothing in the DOM; all output is
 * MapLibre GL source + layer additions. Cleans up on unmount.
 *
 * @param {{ lat: number, lng: number }[]} coordinates  Ordered stop list
 * @param {string} color   Line colour (CSS hex or rgb)
 * @param {number} width   Line width in pixels
 * @param {string} id      Optional stable ID (auto-generated if omitted)
 */
export function MapRoute({ coordinates, color = '#2563eb', width = 4, id }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !coordinates || coordinates.length < 2) return;

    // Unique IDs prevent collisions when multiple routes are rendered
    const uid = id || `route-${++routeCounter}`;
    const layerId = `${uid}-line`;

    const geojson = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        // GeoJSON uses [longitude, latitude] order — opposite to our internal { lat, lng }
        coordinates: coordinates.map((c) => [c.lng, c.lat]),
      },
    };

    map.addSource(uid, { type: 'geojson', data: geojson });

    // Shadow layer for better contrast against the light basemap
    map.addLayer({
      id: `${uid}-shadow`,
      type: 'line',
      source: uid,
      paint: {
        'line-color': '#000000',
        'line-width': width + 3,
        'line-opacity': 0.08,
        'line-blur': 4,
      },
    });

    map.addLayer({
      id: layerId,
      type: 'line',
      source: uid,
      paint: {
        'line-color': color,
        'line-width': width,
        'line-opacity': 0.9,
        'line-cap': 'round',
        'line-join': 'round',
      },
    });

    return () => {
      try {
        if (map.getLayer(`${uid}-shadow`)) map.removeLayer(`${uid}-shadow`);
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(uid)) map.removeSource(uid);
      } catch {
        // Map may have been removed already (component unmounting with map)
      }
    };
  }, [map, coordinates, color, width, id]);

  return null;
}
