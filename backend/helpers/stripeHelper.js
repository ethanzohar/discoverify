/* eslint-disable no-restricted-syntax */
require('dotenv').config();

const { STRIPE_API_KEY } = process.env;
const stripe = require('stripe')(STRIPE_API_KEY);

class StripeHelper {
  static async cancelStripeSubscription(stripeId) {
    return stripe.subscriptions.cancel(stripeId);
  }
}

module.exports = StripeHelper;
