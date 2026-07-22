const axios = require('axios');

const BASE = process.env.SBB_API_BASE_URL || 'https://transport.opendata.ch/v1';

// Well-known SBB station IDs — add more as the project grows
const STATIONS = {
  ZURICH_HB: '8503000',
  BERN: '8507000',
  BASEL_SBB: '8500010',
  LAUSANNE: '8501120',
  GENEVA: '8501008',
};

/**
 * Fetches the live departure board for a station from transport.opendata.ch.
 *
 * The public API is rate-limited; the delay tracker calls this at most every
 * 2 minutes to stay well within the acceptable request rate.
 *
 * @param {string} stationId  SBB station ID (defaults to Zürich HB)
 * @param {number} limit      Max departures to return (API cap: 512)
 */
async function getStationBoard(stationId = STATIONS.ZURICH_HB, limit = 40) {
  const response = await axios.get(`${BASE}/stationboard`, {
    params: { id: stationId, limit },
    timeout: 8_000,
  });

  const raw = response.data.stationboard || [];
  return raw.map(normalizeEntry);
}

/**
 * Maps a raw API entry to our internal shape.
 * Keeps the passList (route stops) needed for the D3 map animation in Step 2.
 */
function normalizeEntry(entry) {
  const delayMinutes = entry.stop?.delay ?? 0;

  return {
    // Stable composite key: timestamp alone isn't unique when real-time data
    // is missing; destination disambiguates trains with the same number.
    id: `${entry.name}-${entry.to ?? 'unknown'}-${entry.stop?.departureTimestamp ?? '0'}`,
    trainName: entry.name,
    category: entry.category,
    number: entry.number,
    operator: entry.operator,
    destination: entry.to,
    platform: entry.stop?.platform ?? '—',
    scheduledDeparture: entry.stop?.departure ?? null,
    departureTimestamp: entry.stop?.departureTimestamp ?? null,
    delayMinutes,
    status: resolveStatus(delayMinutes),
    isOnTime: delayMinutes < 3,
    // Full route — used by the D3 vector map (Step 2) to animate train positions
    passList: (entry.passList || []).map((stop) => ({
      stationId: stop.station?.id,
      stationName: stop.station?.name,
      // transport.opendata.ch uses { type:"WGS84", x:lat, y:lng }
      coordinates:
        stop.station?.coordinate
          ? { lat: stop.station.coordinate.x, lng: stop.station.coordinate.y }
          : null,
      departure: stop.departure,
      arrival: stop.arrival,
      departureTimestamp: stop.departureTimestamp,
      arrivalTimestamp: stop.arrivalTimestamp,
    })),
  };
}

/**
 * Converts delay minutes to a status token.
 * Thresholds mirror standard Swiss rail punctuality definitions:
 *   < 3 min  → on time (SBB counts trains as on time up to 3 min late)
 *   3–9 min  → minor delay
 *   ≥ 10 min → major delay
 */
function resolveStatus(delayMinutes) {
  if (delayMinutes < 3) return 'on_time';
  if (delayMinutes < 10) return 'minor_delay';
  return 'major_delay';
}

/**
 * Full-text location search — used by the station search filter in the frontend.
 */
async function searchLocation(query) {
  const response = await axios.get(`${BASE}/locations`, {
    params: { query, type: 'station' },
    timeout: 5_000,
  });
  return response.data.stations || [];
}

/**
 * Fetches train connections between two stations.
 * Powers the route-finder feature — the user enters "Zürich HB" → "Bern"
 * and we return connections with full stop coordinates for map rendering.
 *
 * @param {string} from   Station name or ID
 * @param {string} to     Station name or ID
 * @param {number} limit  Max connections to return (1–6)
 */
async function getConnections(from, to, limit = 4) {
  const response = await axios.get(`${BASE}/connections`, {
    params: { from, to, limit },
    timeout: 10_000,
  });

  return (response.data.connections || []).map(normalizeConnection);
}

function normalizeConnection(conn) {
  const sections = conn.sections || [];
  const firstJourney = sections.find((s) => s.journey)?.journey;
  const totalDelay = conn.to?.delay ?? 0;

  return {
    id: `${conn.from?.departureTimestamp ?? 0}-${conn.to?.arrivalTimestamp ?? 0}`,
    from: normalizeEndpoint(conn.from),
    to: normalizeEndpoint(conn.to),
    duration: conn.duration ?? '—',
    trainName: firstJourney?.name ?? '—',
    category: firstJourney?.category ?? '—',
    status: resolveStatus(totalDelay),
    totalDelay,
    // Flat ordered list of all stops — used for map line + position interpolation
    route: buildRoute(sections),
  };
}

function normalizeEndpoint(endpoint) {
  if (!endpoint) return null;
  return {
    stationName: endpoint.station?.name ?? '—',
    stationId: endpoint.station?.id ?? null,
    coordinates: toCoords(endpoint.station?.coordinate),
    departure: endpoint.departure ?? null,
    departureTimestamp: endpoint.departureTimestamp ?? null,
    arrival: endpoint.arrival ?? null,
    arrivalTimestamp: endpoint.arrivalTimestamp ?? null,
    delay: endpoint.delay ?? 0,
    platform: endpoint.platform ?? null,
  };
}

/**
 * Flattens all journey sections into a single ordered stop list.
 * Deduplicates by station ID to avoid repeated entries at interchange stations.
 */
function buildRoute(sections) {
  const seen = new Set();
  const stops = [];

  for (const section of sections) {
    const passList = section.journey?.passList ?? [];
    for (const pass of passList) {
      const id = pass.station?.id;
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);

      stops.push({
        stationName: pass.station?.name ?? null,
        stationId: pass.station?.id ?? null,
        coordinates: toCoords(pass.station?.coordinate),
        departure: pass.departure ?? null,
        departureTimestamp: pass.departureTimestamp ?? null,
        arrival: pass.arrival ?? null,
        arrivalTimestamp: pass.arrivalTimestamp ?? null,
        // delay can be null when realtime data is not available for that stop
        delay: pass.delay ?? null,
      });
    }
  }

  return stops;
}

/** Converts { type:"WGS84", x:lat, y:lng } → { lat, lng } or null. */
function toCoords(coord) {
  if (!coord || coord.x == null) return null;
  return { lat: coord.x, lng: coord.y };
}

module.exports = { getStationBoard, getConnections, searchLocation, STATIONS };
