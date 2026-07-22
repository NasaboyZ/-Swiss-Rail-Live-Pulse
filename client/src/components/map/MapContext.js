import { createContext, useContext } from 'react';

// Shared map instance — null until the Map component mounts and the
// MapLibre style has fully loaded (map.on('load') fired).
export const MapContext = createContext(null);

/**
 * Returns the MapLibre Map instance from the nearest <Map> ancestor.
 * Returns null if called outside a Map or before the map has loaded.
 */
export const useMap = () => useContext(MapContext);
