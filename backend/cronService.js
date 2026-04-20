// backend/cronService.js
const { CronJob } = require('cron');
const mongoose = require('mongoose');

const UserController = require('./controllers/userController');
const SpotifyHelper = require('./helpers/spotifyHelper');
const logger = require('./helpers/logger');

mongoose.connect('mongodb://localhost:27017/playlist-generator', {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});

const { connection } = mongoose;

connection.on('connected', () => {
  logger.info({ event: 'db_connected' }, 'MongoDB database connected');
});

connection.on('error', (err) => {
  logger.error({ event: 'db_error', err }, 'MongoDB connection error');
});

const job = new CronJob(
  '00 00 00 * * *',
  async function () {
    const start = Date.now();
    const users = await UserController.getAllUsers();

    logger.info({
      event: 'cron_run_started',
      userCount: users.length,
    }, `Cron run started — ${users.length} users`);

    await SpotifyHelper.updatePlaylists(users);

    logger.info({
      event: 'cron_run_complete',
      userCount: users.length,
      durationMs: Date.now() - start,
    }, `Cron run complete — ${users.length} users processed`);
  },
  null,
  true,
  'America/Toronto'
);
job.start();

logger.info({ event: 'cron_service_started' }, 'Cron service started');
