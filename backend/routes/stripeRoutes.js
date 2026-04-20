// backend/routes/stripeRoutes.js
/* eslint-disable no-case-declarations */
const bodyparser = require('body-parser');
const express = require('express');

require('dotenv').config();

const { STRIPE_API_KEY, STRIPE_ENDPOINT_SECRET } = process.env;
const stripe = require('stripe')(STRIPE_API_KEY);

const StripeSessionController = require('../controllers/stripeSessionController');
const UserController = require('../controllers/userController');
const logger = require('../helpers/logger');

const router = express.Router();
const app = express();

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

router.post('/create-checkout-session', async function (req, res) {
  const { userId, refreshToken, options } = req.body;

  logger.info({ event: 'stripe_checkout_session_creating', userId }, 'Creating Stripe checkout session');

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: 'price_1NUZgmDUxi5iZV5VnB1Owguu',
        quantity: 1,
      },
    ],
    mode: 'subscription',
    subscription_data: {
      trial_period_days: 30,
    },
    success_url: `https://discoverifymusic.com/stripe/success?userId=${userId}`,
    cancel_url: `https://discoverifymusic.com/stripe/cancel`,
    allow_promotion_codes: true,
  });

  await StripeSessionController.createSession(
    session.id,
    userId,
    refreshToken,
    options
  );

  logger.info({
    event: 'stripe_checkout_session_created',
    userId,
    checkoutSessionId: session.id,
  }, 'Stripe checkout session created');

  res.json({ url: session.url });
});

router.post('/process-event', async function (req, res) {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      STRIPE_ENDPOINT_SECRET
    );
  } catch (err) {
    logger.error({ event: 'stripe_webhook_signature_failed', err: err.message }, `Webhook signature verification failed`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  logger.info({ event: 'stripe_webhook_received', type: event.type }, `Stripe webhook received: ${event.type}`);

  const { id, subscription } = event.data.object;
  const session = await StripeSessionController.getSessionBySessionId(id);

  if (!session) {
    logger.warn({
      event: 'stripe_webhook_session_not_found',
      checkoutSessionId: id,
      webhookType: event.type,
    }, 'No pending session found for checkout session ID — ignoring webhook');
    res.send();
    return;
  }

  const { userId, refreshToken, playlistOptions, sessionId } = session;

  switch (event.type) {
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed':
      logger.info({
        event: 'stripe_checkout_expired_or_failed',
        userId,
        checkoutSessionId: id,
        webhookType: event.type,
      }, 'Stripe checkout session expired or payment failed');
      StripeSessionController.deleteSession(sessionId);
      break;
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      logger.info({
        event: 'stripe_checkout_completed',
        userId,
        checkoutSessionId: id,
        stripeId: subscription,
        webhookType: event.type,
      }, 'Stripe checkout completed — subscribing user');
      await UserController.subscribeUser(
        userId,
        refreshToken,
        playlistOptions,
        subscription
      );
      StripeSessionController.deleteSession(sessionId);
      break;
    default:
      logger.info({ event: 'stripe_webhook_unhandled', type: event.type }, `Unhandled Stripe webhook type: ${event.type}`);
      break;
  }

  res.send();
});

module.exports = router;
