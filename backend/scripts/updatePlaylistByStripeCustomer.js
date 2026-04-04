require('dotenv').config();

const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_API_KEY);

const UserModel = require('../models/userSchema');
const SpotifyHelper = require('../helpers/spotifyHelper');
const { decryptUserId } = require('../helpers/userIdCrypto');

const MONGO_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/playlist-generator';

function userForLog(userDoc) {
  const o = userDoc.toObject();
  delete o.refreshToken;
  o.spotifyUserId = decryptUserId(userDoc.userId);
  return o;
}

/**
 * DB usually stores subscription id (sub_...). Accept sub_ (direct match) or cus_ (list subs, then match).
 */
async function findUserByStripeId(stripeId) {
  const direct = await UserModel.findOne({ stripeId });
  if (direct) return direct;

  if (!/^cus_/.test(stripeId)) return null;

  const subs = await stripe.subscriptions.list({
    customer: stripeId,
    status: 'all',
    limit: 100,
  });

  const subscriptionIds = subs.data.map((s) => s.id);
  if (subscriptionIds.length === 0) return null;

  return UserModel.findOne({ stripeId: { $in: subscriptionIds } });
}

async function main() {
  const stripeId = process.argv[2];
  if (!stripeId || !/^(cus_|sub_)/.test(stripeId)) {
    console.error(
      'Usage: node updatePlaylistByStripeCustomer.js <stripe_customer_or_subscription_id>\n' +
        'Examples:\n' +
        '  node updatePlaylistByStripeCustomer.js cus_abc123   (customer id from Stripe Dashboard)\n' +
        '  node updatePlaylistByStripeCustomer.js sub_xyz789   (subscription id — usually what is stored in DB)\n' +
        'Run: node scripts/printSampleUserWithStripeId.js  to print a real stripeId from your database.'
    );
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
  });

  const user = await findUserByStripeId(stripeId);
  if (!user) {
    console.error(`No user found for Stripe id ${stripeId}`);
    process.exitCode = 1;
    return;
  }

  console.log('Found user:', userForLog(user));

  await SpotifyHelper.updatePlaylist(user, null);

  console.log('After playlist update:', userForLog(user));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
