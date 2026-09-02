// src/services/fareInsight.service.js
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

/**
 * Turns a normal fare breakdown into one friendly sentence for the rider.
 * If the Gemini call fails for any reason, falls back to a plain template
 * so a booking is NEVER blocked by an AI outage.
 */
async function explainFare({
  farePaise,
  distanceKm,
  perKmRatePaise,
  baseFarePaise = 0,
  surgeApplied = false,
}) {
  const fareRupees = (farePaise / 100).toFixed(0);
  const baseRupees = (baseFarePaise / 100).toFixed(0);
  const perKmRupees = (perKmRatePaise / 100).toFixed(0);

  const fallback = `₹${fareRupees} = ₹${baseRupees} base fare + ₹${(
    (distanceKm * perKmRatePaise) /
    100
  ).toFixed(0)} for ${distanceKm.toFixed(1)} km at ₹${perKmRupees}/km${
    surgeApplied ? ' (surge applied)' : ''
  }.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Write ONE short, friendly sentence (max 25 words) explaining this fare to a rider. Be plain and factual, no marketing language.
Fare: ₹${fareRupees}. Base: ₹${baseRupees}. Distance: ${distanceKm.toFixed(1)} km at ₹${perKmRupees}/km.
Surge applied: ${surgeApplied ? 'yes' : 'no'}.`,
            },
          ],
        },
      ],
    });

    return response.text?.trim() || fallback;
  } catch (err) {
    console.error('fareInsight.explainFare failed, using fallback:', err.message);
    return fallback;
  }
}

/**
 * Turns a list of rule-based anomaly flags into one reviewer-facing sentence.
 * Only called when detection already found something — this function never
 * decides anomalies itself, only describes ones already found.
 */
async function summarizeAnomaly({ flags, bookingId }) {
  if (!flags || flags.length === 0) return '';

  const fallback = `Booking ${bookingId} flagged: ${flags.join(
    ', '
  )}. Manual review recommended.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Write ONE short sentence (max 30 words) for a fraud-review dashboard, summarizing these automatically-detected flags on a ride booking: ${flags.join(
                '; '
              )}.
Be factual and neutral, recommend review, do not accuse anyone of wrongdoing.`,
            },
          ],
        },
      ],
    });

    return response.text?.trim() || fallback;
  } catch (err) {
    console.error(
      'fareInsight.summarizeAnomaly failed, using fallback:',
      err.message
    );
    return fallback;
  }
}

module.exports = { explainFare, summarizeAnomaly };
