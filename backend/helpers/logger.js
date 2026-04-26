const LEVEL = process.env.LOG_LEVEL || 'info';
const LEVELS = { error: 0, warn: 1, info: 2 };

function log(level, obj, msg) {
  if (LEVELS[level] > LEVELS[LEVEL]) return;
  const out = JSON.stringify({ level, time: Date.now(), service: 'discoverify-backend', msg, ...obj });
  level === 'error' ? console.error(out) : level === 'warn' ? console.warn(out) : console.log(out);
}

module.exports = {
  info: (obj, msg) => log('info', obj, msg),
  warn: (obj, msg) => log('warn', obj, msg),
  error: (obj, msg) => log('error', obj, msg),
};
