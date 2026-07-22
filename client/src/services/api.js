// In dev: Vite proxies /api/* → http://localhost:3001 (see vite.config.js)
// In prod: nginx proxies /api/* → http://server:3001 (see nginx.conf)
// VITE_API_URL only needed for a static build served outside those setups.
const BASE = import.meta.env.VITE_API_URL ?? '';

/**
 * Thin fetch wrapper. Throws with the server's error message on non-2xx.
 * All public functions below are the only surface callers should use.
 */
async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}: ${path}`);
  }

  return res.json();
}

export const fetchDepartures = (stationId = '8503000', limit = 40) =>
  request(`/api/trains/departures?stationId=${stationId}&limit=${limit}`);

export const fetchDelayStats = (hours = 24) =>
  request(`/api/analytics/delays?hours=${hours}`);

export const fetchTopDelayed = (limit = 10) =>
  request(`/api/analytics/top-delayed?limit=${limit}`);

export const searchStations = (q) =>
  request(`/api/trains/search?q=${encodeURIComponent(q)}`);

export const fetchConnections = (from, to, limit = 4) =>
  request(`/api/connections?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=${limit}`);
