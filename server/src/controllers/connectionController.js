const { getConnections } = require('../services/sbbApiService');

/**
 * GET /api/trains/connection?from=Zürich HB&to=Bern&limit=4
 *
 * Returns train connections between two stations with full route data
 * (stop list + coordinates) ready for MapLibre line rendering and
 * train-position interpolation on the frontend.
 */
async function findConnections(req, res, next) {
  try {
    const { from, to } = req.query;

    if (!from || from.trim().length < 2) {
      return res.status(400).json({ error: '"from" must be at least 2 characters' });
    }
    if (!to || to.trim().length < 2) {
      return res.status(400).json({ error: '"to" must be at least 2 characters' });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 4, 1), 6);
    const connections = await getConnections(from.trim(), to.trim(), limit);

    res.json({
      from: from.trim(),
      to: to.trim(),
      fetchedAt: new Date().toISOString(),
      count: connections.length,
      connections,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { findConnections };
