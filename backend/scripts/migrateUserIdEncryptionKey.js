require('dotenv').config();

const mongoose = require('mongoose');
const UserModel = require('../models/userSchema');
const SpotifyHelper = require('../helpers/spotifyHelper');
const {
  decryptUserIdWithSecret,
  encryptUserIdWithSecret,
} = require('../helpers/userIdCrypto');

const MONGO_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/playlist-generator';
const OLD_SECRET = process.env.SPOTIFY_API_CLIENT_SECRET_OLD;
const NEW_SECRET = process.env.SPOTIFY_API_CLIENT_SECRET;
const DRY_RUN = process.argv.includes('--dry-run');

async function migrateUserIdEncryptionKey() {
  if (!OLD_SECRET || !NEW_SECRET) {
    throw new Error(
      'Both SPOTIFY_API_CLIENT_SECRET_OLD and SPOTIFY_API_CLIENT_SECRET are required'
    );
  }

  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
  });

  const users = await UserModel.find();

  let alreadyUsingNewKey = 0;
  let migrated = 0;
  let failed = 0;

  const user = users[0];
  decryptUserIdWithSecret(user.userId, process.env.SPOTIFY_API_CLIENT_SECRET);
  decryptUserIdWithSecret(user.userId, process.env.SPOTIFY_API_CLIENT_SECRET_OLD);
  decryptUserIdWithSecret(user.userId, process.env.SPOTIFY_API_CLIENT_SECRET_OLD_2);
  

  // for (let i = 0; i < 1; i += 1) {
  //   // for (let i = 0; i < users.length; i += 1) {
  //   const user = users[i];

  //   const decryptedWithNew = decryptUserIdWithSecret(user.userId, NEW_SECRET);
  //   if (decryptedWithNew) {
  //     alreadyUsingNewKey += 1;
  //   } else {
  //     const decryptedWithOld = decryptUserIdWithSecret(user.userId, OLD_SECRET);
  //     if (!decryptedWithOld) {
  //       failed += 1;
  //       // Keep logs minimal and avoid leaking full ids.
  //       console.log(`Failed to decrypt user at index ${i}`);
  //     } else {
  //       user.userId = encryptUserIdWithSecret(decryptedWithOld, NEW_SECRET);
  //       try {
  //         await SpotifyHelper.updatePlaylist(user, null);

  //         migrated += 1;
  //       } catch (error) {
  //         failed += 1;
  //         console.log(
  //           `updatePlaylist failed for migrated user at index ${i}: ${error.message}`
  //         );
  //       }
  //       // let saveFailed = false;

  //       // if (!DRY_RUN) {
  //       //   try {
  //       //     await user.save();
  //       //   } catch (error) {
  //       //     saveFailed = true;
  //       //     failed += 1;
  //       //     console.log(
  //       //       `Failed to save migrated user at index ${i}: ${error.message}`
  //       //     );
  //       //   }
  //       // }

  //       // if (DRY_RUN || !saveFailed) {
  //       //   migrated += 1;
  //       // }
  //     }
  //   }
  // }

  console.log('UserId key migration complete');
  console.log(`Total users: ${users.length}`);
  console.log(`Already using new key: ${alreadyUsingNewKey}`);
  console.log(`Migrated old -> new: ${migrated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Dry run: ${DRY_RUN}`);
}

migrateUserIdEncryptionKey()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
