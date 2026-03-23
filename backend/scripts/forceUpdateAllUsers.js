require('dotenv').config();

const mongoose = require('mongoose');
const UserController = require('../controllers/userController');
const SpotifyHelper = require('../helpers/spotifyHelper');

const MONGO_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/playlist-generator';

async function forceUpdateAllUsers() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
  });

  const users = await UserController.getAllUsers();
  await SpotifyHelper.updatePlaylists(users);

  console.log(`Force update complete}`);
}

forceUpdateAllUsers()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
