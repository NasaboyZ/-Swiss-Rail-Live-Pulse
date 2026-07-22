const mongoose = require('mongoose');

let _connected = false;

/**
 * Attempts a non-blocking MongoDB connection.
 *
 * The server starts and serves requests regardless of DB availability.
 * Analytics endpoints degrade gracefully when isConnected() returns false.
 * Live departure data from the SBB API works without any DB connection.
 */
async function connectDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/railpulse';

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    _connected = true;

    const { host, port, name } = mongoose.connection;
    console.log(`✅ MongoDB connected → ${host}:${port}/${name}`);

    mongoose.connection.on('disconnected', () => {
      _connected = false;
      console.warn('⚠  MongoDB disconnected — analytics will be unavailable');
    });
    mongoose.connection.on('reconnected', () => {
      _connected = true;
      console.log('✅ MongoDB reconnected');
    });
  } catch (err) {
    // Non-fatal: log clearly but do not throw.
    // The live departure board works without MongoDB.
    console.warn(
      '⚠  MongoDB unavailable — analytics & delay tracking disabled.\n' +
      `   Reason: ${err.message}\n` +
      '   Tip: run "docker run -d -p 27017:27017 mongo:7" to enable all features.'
    );
  }
}

/** True only when Mongoose is in the "connected" state (readyState === 1). */
function isConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDatabase, isConnected };
