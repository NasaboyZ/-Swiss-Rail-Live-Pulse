const DelayEvent = require('../models/DelayEvent');
const { isConnected } = require('../config/database');

/**
 * GET /api/analytics/delays?hours=24
 *
 * Aggregates the persisted delay events into hourly buckets.
 * The response shape is designed to be consumed directly by a D3 line chart
 * in the frontend (Step 3 of the project roadmap).
 *
 * Returns a 503 with a descriptive message when MongoDB is not connected
 * so the frontend can show a sensible fallback instead of a generic error.
 */
async function getDelayStats(req, res, next) {
  if (!isConnected()) {
    return res.status(503).json({
      error: 'Analytics unavailable: MongoDB is not connected. Start MongoDB to enable this feature.',
    });
  }

  try {
    const hours = Math.min(Number(req.query.hours) || 24, 168); // cap at 7 days
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const hourlyBuckets = await DelayEvent.aggregate([
      { $match: { recordedAt: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: '$recordedAt' },
            month: { $month: '$recordedAt' },
            day: { $dayOfMonth: '$recordedAt' },
            hour: { $hour: '$recordedAt' },
          },
          avgDelay: { $avg: '$delayMinutes' },
          maxDelay: { $max: '$delayMinutes' },
          totalTrains: { $sum: 1 },
          delayedTrains: {
            $sum: { $cond: [{ $gte: ['$delayMinutes', 3] }, 1, 0] },
          },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.day': 1,
          '_id.hour': 1,
        },
      },
    ]);

    // Flatten to a D3-friendly array of { timestamp, avgDelay, … }
    // MongoDB's $year/$month/$day/$hour aggregation operators extract UTC
    // components, so we must reconstruct with Date.UTC — not new Date() —
    // to avoid a local-timezone offset that would shift buckets by ±N hours.
    const chartData = hourlyBuckets.map((b) => ({
      timestamp: new Date(
        Date.UTC(b._id.year, b._id.month - 1, b._id.day, b._id.hour)
      ).toISOString(),
      avgDelay: Math.round(b.avgDelay * 10) / 10,
      maxDelay: b.maxDelay,
      totalTrains: b.totalTrains,
      delayedTrains: b.delayedTrains,
      punctualityRate: Math.round(
        ((b.totalTrains - b.delayedTrains) / b.totalTrains) * 100
      ),
    }));

    // Single-row summary for the KPI cards
    const [summary] = await DelayEvent.aggregate([
      { $match: { recordedAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          avgDelay: { $avg: '$delayMinutes' },
          maxDelay: { $max: '$delayMinutes' },
          totalTrains: { $sum: 1 },
          onTimeTrains: { $sum: { $cond: ['$isOnTime', 1, 0] } },
        },
      },
    ]);

    res.json({
      window: `${hours}h`,
      since: since.toISOString(),
      summary: summary ?? { avgDelay: 0, maxDelay: 0, totalTrains: 0, onTimeTrains: 0 },
      chartData,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analytics/top-delayed?limit=10
 *
 * Returns the train lines with the highest average delay in the last 24 hours.
 * Powers the "Top Offenders" table in the analytics panel.
 */
async function getTopDelayed(req, res, next) {
  if (!isConnected()) {
    return res.status(503).json({
      error: 'Analytics unavailable: MongoDB is not connected.',
    });
  }

  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const results = await DelayEvent.aggregate([
      { $match: { recordedAt: { $gte: since }, delayMinutes: { $gte: 3 } } },
      {
        $group: {
          _id: { trainName: '$trainName', destination: '$destination' },
          occurrences: { $sum: 1 },
          avgDelay: { $avg: '$delayMinutes' },
          maxDelay: { $max: '$delayMinutes' },
        },
      },
      { $sort: { avgDelay: -1 } },
      { $limit: limit },
    ]);

    res.json({
      since: since.toISOString(),
      topDelayed: results.map((r) => ({
        trainName: r._id.trainName,
        destination: r._id.destination,
        occurrences: r.occurrences,
        avgDelay: Math.round(r.avgDelay * 10) / 10,
        maxDelay: r.maxDelay,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDelayStats, getTopDelayed };
