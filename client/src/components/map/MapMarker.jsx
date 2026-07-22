import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from './MapContext';

/**
 * Standard station dot marker.
 *
 * @param {{ lat: number, lng: number }} coordinates
 * @param {string}  color    Fill colour
 * @param {number}  size     Diameter in pixels
 * @param {string}  tooltip  Optional hover label
 */
export function MapMarker({ coordinates, color = '#2563eb', size = 10, tooltip }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !coordinates) return;

    const el = document.createElement('div');
    el.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 2px solid #fff;
      border-radius: 50%;
      box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      cursor: default;
    `;

    if (tooltip) el.title = tooltip;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([coordinates.lng, coordinates.lat])
      .addTo(map);

    return () => marker.remove();
  }, [map, coordinates, color, size, tooltip]);

  return null;
}

/**
 * Animated train-position marker — the live "where is the train now?" dot.
 * Updates position without DOM recreation for smooth movement.
 *
 * @param {{ lat: number, lng: number } | null} coordinates
 * @param {string} status  on_time | minor_delay | major_delay
 * @param {string} label   e.g. "IC 1 · +3 min"
 */
export function TrainMarker({ coordinates, status = 'on_time', label }) {
  const map = useMap();
  const markerRef = useRef(null);

  const color =
    status === 'on_time'     ? '#059669' :
    status === 'minor_delay' ? '#d97706' : '#dc2626';

  // Create or recreate marker when map becomes ready
  useEffect(() => {
    if (!map || !coordinates) return;

    const el = document.createElement('div');
    el.style.cssText = `
      width: 20px;
      height: 20px;
      background: ${color};
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      animation: train-pulse 2s ease-in-out infinite;
      cursor: default;
    `;
    if (label) el.title = label;

    const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([coordinates.lng, coordinates.lat])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, color, label]); // recreate only if color/label changes

  // Update position in-place — avoids DOM churn on every 5-second tick
  useEffect(() => {
    if (markerRef.current && coordinates) {
      markerRef.current.setLngLat([coordinates.lng, coordinates.lat]);
    }
  }, [coordinates]);

  return null;
}
