// backend/helpers/stripeHelper.js
/* eslint-disable no-restricted-syntax */
require('dotenv').config();

const { STRIPE_API_KEY } = process.env;
const stripe = require('stripe')(STRIPE_API_KEY);
const logger = require('./logger');

class StripeHelper {
  static async cancelStripeSubscription(stripeId) {
    logger.info(
      { event: 'stripe_cancel_attempt', stripeId },
      'Attempting to cancel Stripe subscription'
    );
    try {
      const result = await stripe.subscriptions.cancel(stripeId);
      logger.info(
        { event: 'stripe_cancel_success', stripeId, status: result.status },
        'Stripe subscription cancelled'
      );
      return result;
    } catch (err) {
      logger.error(
        {
          event: 'stripe_cancel_error',
          stripeId,
          stripeErrorType: err.type,
          stripeErrorCode: err.raw && err.raw.code,
        },
        'Stripe subscription cancellation threw an error'
      );
      throw err;
    }
  }
}

module.exports = StripeHelper;
