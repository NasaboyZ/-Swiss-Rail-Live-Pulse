const mongoose = require('mongoose');

// One document = one departure snapshot captured by the delay tracker.
// We intentionally store every polling cycle so the analytics chart can
// compute trends and punctuality rates over arbitrary time windows.
const delayEventSchema = new mongoose.Schema(
  {
    trainName: { type: String, required: true },         // "IC 1"
    trainCategory: { type: String, required: true },     // "IC" | "IR" | "S" | "RE" …
    trainNumber: { type: String },                        // "1"
    operator: { type: String },                           // "SBB"
    stationId: { type: String, required: true },         // "8503000"
    stationName: { type: String, required: true },       // "Zürich HB"
    destination: { type: String },                        // "Genève-Aéroport"
    platform: { type: String },                           // "7"
    scheduledDeparture: { type: Date, required: true },  // ISO timestamp from SBB API
    delayMinutes: { type: Number, required: true },      // 0 = on time, negative = early
    isOnTime: { type: Boolean, required: true },         // delay < 3 min
    recordedAt: { type: Date, default: Date.now },       // when this snapshot was taken
  },
  {
    timestamps: true,
    collection: 'delay_events',
  }
);

// Compound index for the analytics aggregation pipeline (time-range + station queries)
delayEventSchema.index({ stationId: 1, recordedAt: -1 });
delayEventSchema.index({ trainName: 1, recordedAt: -1 });

const DelayEvent = mongoose.model('DelayEvent', delayEventSchema);

module.exports = DelayEvent;
