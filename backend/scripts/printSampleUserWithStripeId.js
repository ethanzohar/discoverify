require('dotenv').config();

const mongoose = require('mongoose');

const UserModel = require('../models/userSchema');
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
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
  });

  const user = await UserModel.findOne({
    stripeId: { $exists: true, $nin: [null, ''] },
  });

  if (!user) {
    console.error('No user found with a non-empty stripeId.');
    process.exitCode = 1;
    return;
  }

  console.log(`
Stripe identifiers are IDs, not tokens. Do not use secret keys (sk_live_...) or publishable keys (pk_...).

What is stored in this app's users.stripeId field is usually the subscription id from Checkout (starts with sub_).
  Example shape: sub_1AbCdEf2GhIjKlMn (yours will be different — copy the value below)

A Stripe customer id (Dashboard → Customers) starts with cus_.
  Example shape: cus_AbCdEfGhIjKlMnO

Use the value from stripeId below with updatePlaylistByStripeCustomer.js (that script accepts both sub_ and cus_).
`);

  console.log('Sample user:', userForLog(user));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
