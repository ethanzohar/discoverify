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
 * Users store Stripe subscription id (sub_...) on stripeId. Resolve a customer id (cus_...)
 * by listing that customer's subscriptions and matching against the DB.
 */
async function findUserByStripeCustomerId(customerId) {
  const direct = await UserModel.findOne({ stripeId: customerId });
  if (direct) return direct;

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
  });

  const subscriptionIds = subs.data.map((s) => s.id);
  if (subscriptionIds.length === 0) return null;

  return UserModel.findOne({ stripeId: { $in: subscriptionIds } });
}

async function main() {
  const customerId = process.argv[2];
  if (!customerId || !/^cus_/.test(customerId)) {
    console.error(
      'Usage: node updatePlaylistByStripeCustomer.js <stripe_customer_id>\n' +
        'Example: node updatePlaylistByStripeCustomer.js cus_abc123'
    );
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
  });

  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    console.error(`No user found for Stripe customer ${customerId}`);
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

//   cd backend
// node scripts/updatePlaylistByStripeCustomer.js cus_xxxxx
