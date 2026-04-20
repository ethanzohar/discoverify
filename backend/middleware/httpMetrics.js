// backend/middleware/httpMetrics.js
const { httpRequestsTotal, httpRequestDurationSeconds } = require('../helpers/metrics');
const logger = require('../helpers/logger');

function httpMetrics(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const route = (req.route && req.route.path) ? req.route.path : 'unknown';
    const durationMs = Date.now() - start;

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });

    httpRequestDurationSeconds.observe(
      { method: req.method, route, status_code: res.statusCode },
      durationMs / 1000
    );

    logger.info({
      event: 'http_request',
      method: req.method,
      route,
      statusCode: res.statusCode,
      durationMs,
    }, 'HTTP request');
  });

  next();
}

module.exports = httpMetrics;
