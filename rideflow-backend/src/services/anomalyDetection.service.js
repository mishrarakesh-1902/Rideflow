// src/services/anomalyDetection.service.js
const Booking = require('../models/Booking.model');

// Tune these thresholds as you like — they're deliberately simple and explainable.
let FARE_HIGH_MULTIPLIER = 2.5; // fare more than 2.5x expected → flag
let FARE_LOW_MULTIPLIER = 0.4; // fare less than 0.4x expected → flag
let REPEATED_PAIR_WINDOW_DAYS = 7;
let REPEATED_PAIR_THRESHOLD = 5; // same rider+driver more than 5x in the window

function setRepeatedPairThreshold(val) {
  REPEATED_PAIR_THRESHOLD = val;
}

function getRepeatedPairThreshold() {
  return REPEATED_PAIR_THRESHOLD;
}

/**
 * Compares actual fare to what distance x rate should produce.
 * Returns a flag string, or null if the fare looks normal.
 */
function detectFareAnomaly({ farePaise, distanceKm, perKmRatePaise, baseFarePaise }) {
  const expectedPaise = baseFarePaise + distanceKm * perKmRatePaise;
  if (expectedPaise <= 0) return null; // avoid divide-by-zero on bad data

  const ratio = farePaise / expectedPaise;

  if (ratio > FARE_HIGH_MULTIPLIER) {
    return `fare_too_high (${ratio.toFixed(1)}x expected)`;
  }

  if (ratio < FARE_LOW_MULTIPLIER) {
    return `fare_too_low (${ratio.toFixed(1)}x expected)`;
  }

  return null;
}

/**
 * Checks how many times this exact rider+driver pair has completed a ride
 * together in the last N days. Flags if it's unusually high.
 */
async function detectRepeatedPairing(riderId, driverId) {
  if (!riderId || !driverId) return null;

  const since = new Date(Date.now() - REPEATED_PAIR_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const count = await Booking.countDocuments({
    rider: riderId,
    driver: driverId,
    status: 'completed',
    createdAt: { $gte: since },
  });

  if (count >= REPEATED_PAIR_THRESHOLD) {
    return `repeated_pairing (${count}x in ${REPEATED_PAIR_WINDOW_DAYS} days)`;
  }

  return null;
}

module.exports = {
  detectFareAnomaly,
  detectRepeatedPairing,
  FARE_HIGH_MULTIPLIER,
  FARE_LOW_MULTIPLIER,
  REPEATED_PAIR_WINDOW_DAYS,
  REPEATED_PAIR_THRESHOLD,
  setRepeatedPairThreshold,
  getRepeatedPairThreshold,
};
