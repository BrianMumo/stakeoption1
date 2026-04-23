/**
 * Exchange Rate Service — Live KES/USD rates with caching.
 *
 * Fetches from Frankfurter API (free, no key required).
 * Falls back to ExchangeRate-API open access endpoint.
 * Caches the rate for 1 hour to avoid excessive requests.
 */

const axios = require('axios');

// ── Cache ──
let cachedRate = null;
let cachedAt = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const FALLBACK_RATE = 129.50; // Emergency fallback if all APIs fail

/**
 * Get the current KES per USD exchange rate.
 * Returns a cached value if less than 1 hour old.
 */
async function getKesPerUsd() {
  // Return cached rate if still fresh
  if (cachedRate && (Date.now() - cachedAt) < CACHE_DURATION_MS) {
    return cachedRate;
  }

  // Try primary: Frankfurter API
  try {
    const res = await axios.get('https://api.frankfurter.dev/v1/latest?from=USD&to=KES', {
      timeout: 8000,
    });
    if (res.data?.rates?.KES) {
      cachedRate = res.data.rates.KES;
      cachedAt = Date.now();
      console.log(`[ExchangeRate] Frankfurter: 1 USD = ${cachedRate} KES`);
      return cachedRate;
    }
  } catch (err) {
    console.warn('[ExchangeRate] Frankfurter API failed:', err.message);
  }

  // Try fallback: ExchangeRate-API (open access)
  try {
    const res = await axios.get('https://open.er-api.com/v6/latest/USD', {
      timeout: 8000,
    });
    if (res.data?.rates?.KES) {
      cachedRate = res.data.rates.KES;
      cachedAt = Date.now();
      console.log(`[ExchangeRate] ExchangeRate-API: 1 USD = ${cachedRate} KES`);
      return cachedRate;
    }
  } catch (err) {
    console.warn('[ExchangeRate] ExchangeRate-API failed:', err.message);
  }

  // All APIs failed — use last known or hardcoded fallback
  if (cachedRate) {
    console.warn(`[ExchangeRate] All APIs failed, using stale cached rate: ${cachedRate}`);
    return cachedRate;
  }

  console.warn(`[ExchangeRate] All APIs failed, no cache, using fallback: ${FALLBACK_RATE}`);
  return FALLBACK_RATE;
}

/**
 * Convert USD to KES
 */
async function usdToKes(usdAmount) {
  const rate = await getKesPerUsd();
  return Math.round(usdAmount * rate);
}

/**
 * Convert KES to USD
 */
async function kesToUsd(kesAmount) {
  const rate = await getKesPerUsd();
  return parseFloat((kesAmount / rate).toFixed(2));
}

/**
 * Get rate info (for debugging / admin display)
 */
function getRateInfo() {
  return {
    rate: cachedRate || FALLBACK_RATE,
    cachedAt: cachedAt ? new Date(cachedAt).toISOString() : null,
    isStale: cachedAt ? (Date.now() - cachedAt) > CACHE_DURATION_MS : true,
    fallbackRate: FALLBACK_RATE,
  };
}

module.exports = { getKesPerUsd, usdToKes, kesToUsd, getRateInfo };
