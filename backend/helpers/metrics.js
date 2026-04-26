// backend/helpers/metrics.js
const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const subscriptionEventsTotal = new client.Counter({
  name: 'subscription_events_total',
  help: 'Total subscription lifecycle events',
  labelNames: ['event'],
  registers: [register],
});

const stripeCancellationTotal = new client.Counter({
  name: 'stripe_cancellation_total',
  help: 'Stripe subscription cancellation outcomes',
  labelNames: ['result'],
  registers: [register],
});

const spotifyApiErrorsTotal = new client.Counter({
  name: 'spotify_api_errors_total',
  help: 'Spotify API errors by reason',
  labelNames: ['reason'],
  registers: [register],
});

module.exports = {
  register,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  subscriptionEventsTotal,
  stripeCancellationTotal,
  spotifyApiErrorsTotal,
};
