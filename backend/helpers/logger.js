// backend/helpers/logger.js
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'discoverify-backend' },
  formatters: {
    level(label) { return { level: label }; },
  },
});

module.exports = logger;
