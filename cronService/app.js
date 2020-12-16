const { CronJob } = require('cron');
const mongoose = require('mongoose');

const UserController = require('./controllers/userController');
const SpotifyHelper = require('./helpers/spotifyHelper');

mongoose.connect('mongodb://localhost:27017/playlist-generator', {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});

const a = async () => {
  console.log('Starting job2');
  const users = await UserController.getAllUsers();
  SpotifyHelper.updatePlaylists(users);
};

const { connection } = mongoose;

connection.on('connected', () => {
  console.log('MongoDB database connected');

  a();
});

connection.on('error', () => {
  console.log('MongoDB Connection Error');
});

const job = new CronJob(
  '00 00 00 * * *',
  async function () {
    console.log('Starting job');
    const users = await UserController.getAllUsers();
    SpotifyHelper.updatePlaylists(users);
  },
  null,
  true,
  'America/Toronto'
);
job.start();
