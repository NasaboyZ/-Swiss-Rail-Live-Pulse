const { getStationBoard, searchLocation, STATIONS } = require('../services/sbbApiService');

/**
 * GET /api/trains/departures?stationId=8503000&limit=40
 *
 * Returns the live departure board for a station, normalized to our internal
 * format. The frontend polls this endpoint every 30 seconds via MobX.
 */
// SBB station IDs are 7-digit numeric strings (UIC location codes)
const STATION_ID_PATTERN = /^\d{7}$/;

async function getDepartures(req, res, next) {
  try {
    const rawId = req.query.stationId ?? STATIONS.ZURICH_HB;

    if (!STATION_ID_PATTERN.test(rawId)) {
      return res.status(400).json({ error: 'stationId must be a 7-digit UIC station code' });
    }

    // Clamp limit: minimum 1, maximum 200 (API allows up to 512 but we keep payloads small)
    const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 200);
    const departures = await getStationBoard(rawId, limit);

    res.json({
      stationId: rawId,
      fetchedAt: new Date().toISOString(),
      count: departures.length,
      departures,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/trains/search?q=Bern
 *
 * Proxies the transport.opendata.ch location search.
 * Used by the station picker in the frontend filter sidebar.
 */
async function searchStations(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }
    const stations = await searchLocation(q.trim());
    res.json({ stations });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDepartures, searchStations };
