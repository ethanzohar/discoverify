/* eslint-disable no-case-declarations */
const bodyparser = require('body-parser');
const express = require('express');

require('dotenv').config();

const { STRIPE_API_KEY, STRIPE_ENDPOINT_SECRET } = process.env;
const stripe = require('stripe')(STRIPE_API_KEY);

const StripeSessionController = require('../controllers/stripeSessionController');
const UserController = require('../controllers/userController');

const router = express.Router();
const app = express();

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

router.post('/create-checkout-session', async function (req, res) {
  const { userId, refreshToken, options } = req.body;

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
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const { id, subscription } = event.data.object;
  const session = await StripeSessionController.getSessionBySessionId(id);

  if (!session) {
    res.send();
    return;
  }

  const { userId, refreshToken, playlistOptions, sessionId } = session;

  // Handle the event
  switch (event.type) {
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed':
      StripeSessionController.deleteSession(sessionId);
      break;
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await UserController.subscribeUser(
        userId,
        refreshToken,
        playlistOptions,
        subscription
      );

      StripeSessionController.deleteSession(sessionId);
      break;
    // ... handle other event types
    default:
      break;
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
});

module.exports = router;
