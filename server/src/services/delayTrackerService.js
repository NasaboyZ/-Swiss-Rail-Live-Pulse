const cron = require('node-cron');
const DelayEvent = require('../models/DelayEvent');
const { getStationBoard, STATIONS } = require('./sbbApiService');
const { isConnected } = require('../config/database');

/**
 * Background worker that polls the SBB API every 2 minutes and persists
 * each departure as a DelayEvent document.
 *
 * This accumulates the historical data that powers the analytics chart —
 * the "OnTime"-inspired feature of the dashboard.
 *
 * Skips silently when MongoDB is not connected so the rest of the server
 * continues working without analytics.
 */
function startDelayTracker() {
  console.log('⏱  Delay tracker started (polls every 2 minutes)');

  // Fire immediately on boot so the DB isn't empty during first-run demos
  captureSnapshot();

  // node-cron expression: every 2 minutes
  cron.schedule('*/2 * * * *', captureSnapshot);
}

async function captureSnapshot() {
  // Skip gracefully when MongoDB isn't available
  if (!isConnected()) {
    return;
  }

  try {
    const departures = await getStationBoard(STATIONS.ZURICH_HB, 50);

    // Skip entries without a scheduled departure — storing a fallback of
    // Date.now() would corrupt analytics queries that group by hour.
    const documents = departures
      .filter((d) => d.scheduledDeparture !== null)
      .map((d) => ({
        trainName: d.trainName,
        trainCategory: d.category,
        trainNumber: d.number,
        operator: d.operator,
        stationId: STATIONS.ZURICH_HB,
        stationName: 'Zürich HB',
        destination: d.destination,
        platform: d.platform,
        scheduledDeparture: new Date(d.scheduledDeparture),
        delayMinutes: d.delayMinutes,
        isOnTime: d.isOnTime,
        recordedAt: new Date(),
      }));

    if (documents.length > 0) {
      // ordered:false → continue inserting even if one document fails validation
      await DelayEvent.insertMany(documents, { ordered: false });
      console.log(`📊 Captured ${documents.length} departures from Zürich HB`);
    }
  } catch (err) {
    // Non-fatal: a single failed poll should never crash the server
    console.error('[DelayTracker] Snapshot failed:', err.message);
  }
}

module.exports = { startDelayTracker };
