require('dotenv').config();

const mongoose = require('mongoose');

const UserController = require('../controllers/userController');
const { decryptUserId } = require('../helpers/userIdCrypto');

const MONGO_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/playlist-generator';

function userForLog(userDoc) {
  const o = userDoc.toObject();
  delete o.refreshToken;
  o.spotifyUserId = decryptUserId(userDoc.userId);
  return o;
}

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error(
      'Usage: node printUserByUserId.js <spotify_user_id>\n' +
        'Example: node printUserByUserId.js abc123xyz'
    );
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
  });

  const user = await UserController.getUser(userId);

  if (!user) {
    console.error(`No user found for userId: ${userId}`);
    process.exitCode = 1;
    return;
  }

  console.log(userForLog(user));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
