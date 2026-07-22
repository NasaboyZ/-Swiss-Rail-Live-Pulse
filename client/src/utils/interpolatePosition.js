/**
 * Interpolates a train's current geographic position along its route.
 *
 * Algorithm:
 *   1. Walk the stop list (passList) looking for the segment where
 *      `now` falls between departureTimestamp of stop N and arrivalTimestamp of stop N+1.
 *   2. Compute progress t ∈ [0, 1] within that segment.
 *   3. Linear-interpolate lat/lng between the two stops.
 *
 * This is the core of the railOscope-style animation — pure math, no API needed.
 *
 * @param {Array}  route   Ordered stop list from the connection API
 * @param {number} nowMs   Current Unix time in milliseconds (Date.now())
 * @returns {{ lat: number, lng: number } | null}
 */
export function interpolatePosition(route, nowMs) {
  if (!route || route.length < 2) return null;

  // The SBB API timestamps are in seconds; Date.now() is milliseconds
  const nowSec = Math.floor(nowMs / 1000);

  // Only work with stops that have both coordinates and at least one timestamp
  const stops = route.filter(
    (s) => s.coordinates && (s.departureTimestamp || s.arrivalTimestamp)
  );

  if (stops.length === 0) return null;

  const firstTs = stops[0].departureTimestamp || stops[0].arrivalTimestamp;
  const lastTs  = stops[stops.length - 1].arrivalTimestamp || stops[stops.length - 1].departureTimestamp;

  // Before journey starts — pin to origin
  if (nowSec < firstTs) return stops[0].coordinates;

  // After journey ends — pin to destination
  if (nowSec > lastTs) return stops[stops.length - 1].coordinates;

  // Find the active segment
  for (let i = 0; i < stops.length - 1; i++) {
    const curr = stops[i];
    const next = stops[i + 1];

    const depTs = curr.departureTimestamp || curr.arrivalTimestamp;
    const arrTs = next.arrivalTimestamp   || next.departureTimestamp;

    if (!depTs || !arrTs || nowSec < depTs || nowSec > arrTs) continue;

    // Progress within this segment [0, 1]
    const t = (nowSec - depTs) / (arrTs - depTs);

    return {
      lat: curr.coordinates.lat + (next.coordinates.lat - curr.coordinates.lat) * t,
      lng: curr.coordinates.lng + (next.coordinates.lng - curr.coordinates.lng) * t,
    };
  }

  return stops[stops.length - 1].coordinates;
}

/**
 * Splits a route into the portion the train has already passed (green)
 * and the portion still ahead (blue).
 *
 * The split point is the live interpolated train position, so the two line
 * segments connect seamlessly at the train's current location.
 *
 * @returns {{ passed: {lat,lng}[], upcoming: {lat,lng}[] }}
 */
export function getRouteProgress(route, nowMs) {
  if (!route || route.length < 2) return { passed: [], upcoming: [] };

  const nowSec = Math.floor(nowMs / 1000);
  const withCoords = route.filter((s) => s.coordinates);

  if (withCoords.length < 2) {
    return { passed: [], upcoming: withCoords.map((s) => s.coordinates) };
  }

  const trainPos = interpolatePosition(route, nowMs);

  if (!trainPos) {
    return { passed: [], upcoming: withCoords.map((s) => s.coordinates) };
  }

  // Find the index of the last stop the train has already departed from
  let splitIdx = 0;
  for (let i = 0; i < withCoords.length; i++) {
    const ts = withCoords[i].departureTimestamp ?? withCoords[i].arrivalTimestamp;
    if (ts && ts <= nowSec) {
      splitIdx = i;
    } else if (ts) {
      break;
    }
  }

  return {
    // Green: origin → last-passed stop → train position
    passed: [
      ...withCoords.slice(0, splitIdx + 1).map((s) => s.coordinates),
      trainPos,
    ],
    // Blue: train position → next stop → … → destination
    upcoming: [
      trainPos,
      ...withCoords.slice(splitIdx + 1).map((s) => s.coordinates),
    ],
  };
}

/**
 * Computes the bounding box for a list of stops with coordinates.
 * Used to fit the map view to the entire route.
 *
 * @returns {{ sw: [lng, lat], ne: [lng, lat] } | null}
 */
export function routeBounds(route) {
  const pts = route.filter((s) => s.coordinates);
  if (pts.length === 0) return null;

  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  for (const { coordinates: { lat, lng } } of pts) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  return {
    sw: [minLng, minLat],
    ne: [maxLng, maxLat],
  };
}
