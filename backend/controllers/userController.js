// backend/controllers/userController.js
const UserModel = require('../models/userSchema');
const SpotifyHelper = require('../helpers/spotifyHelper');
const StripeHelper = require('../helpers/stripeHelper');
const {
  encryptUserId,
  getEncryptedUserIdCandidates,
} = require('../helpers/userIdCrypto');
const logger = require('../helpers/logger');
const {
  subscriptionEventsTotal,
  stripeCancellationTotal,
} = require('../helpers/metrics');

class UserController {
  static async subscribeUser(userId, refreshToken, options, stripeId = null) {
    let user = await UserController.getUser(userId);

    if (user) {
      const previousStripeId = user.stripeId;
      user.refreshToken = refreshToken;
      if (stripeId !== null) {
        user.stripeId = stripeId;
      }
      await user.save();

      if (stripeId !== null) {
        const event = previousStripeId ? 'user_resubscribed' : 'user_subscribed';
        subscriptionEventsTotal.inc({ event });
        logger.info({
          event,
          userId,
          stripeId,
          previousStripeId: previousStripeId || undefined,
          playlistId: user.playlistId,
          grandmothered: user.grandmothered,
          isNewUser: false,
        }, event === 'user_resubscribed' ? 'User resubscribed' : 'Existing user subscribed via Stripe');
      }
    } else {
      user = await UserController.createUser(
        userId,
        refreshToken,
        options,
        stripeId
      );
      await SpotifyHelper.updatePlaylist(user, null);

      if (stripeId !== null) {
        subscriptionEventsTotal.inc({ event: 'user_subscribed' });
        logger.info({
          event: 'user_subscribed',
          userId,
          stripeId,
          playlistId: user.playlistId,
          grandmothered: false,
          isNewUser: true,
        }, 'New user subscribed');
      }
    }

    const returnUser = user.toObject();
    returnUser.userId = userId;

    return returnUser;
  }

  static async getUser(userId) {
    return UserModel.findOne({
      userId: { $in: getEncryptedUserIdCandidates(userId) },
    });
  }

  static async getUserByRefreshToken(refreshToken) {
    return UserModel.findOne({ refreshToken });
  }

  static async getAllUsers() {
    return UserModel.find();
  }

  static async createUser(userId, refreshToken, playlistOptions, stripeId) {
    return UserModel.create({
      userId: encryptUserId(userId),
      refreshToken,
      playlistOptions,
      stripeId,
    });
  }

  static async deleteUser(userId) {
    const user = await UserController.getUser(userId);

    if (user && user.stripeId) {
      try {
        await StripeHelper.cancelStripeSubscription(user.stripeId);
        stripeCancellationTotal.inc({ result: 'success' });
        logger.info({
          event: 'user_unsubscribed',
          userId,
          stripeId: user.stripeId,
          playlistId: user.playlistId,
          grandmothered: user.grandmothered,
          stripeCancelled: true,
        }, 'User unsubscribed — Stripe subscription cancelled');
      } catch (err) {
        if (
          err.type !== 'StripeInvalidRequestError' ||
          err.raw.code !== 'resource_missing'
        ) {
          throw err;
        } else {
          stripeCancellationTotal.inc({ result: 'resource_missing' });
          logger.error({
            event: 'stripe_cancel_failed',
            userId,
            stripeId: user.stripeId,
            stripeErrorType: err.type,
            stripeErrorCode: err.raw.code,
          }, '[STRIPE_RESOURCE_MISSING] Subscription not found in Stripe — user deleted from DB but subscription NOT cancelled');
        }
      }
    } else {
      subscriptionEventsTotal.inc({ event: 'unsubscribe' });
      logger.info({
        event: user ? 'user_unsubscribe_no_stripe_id' : 'user_unsubscribe_not_found',
        userId,
        grandmothered: user ? user.grandmothered : undefined,
        stripeId: null,
      }, 'User unsubscribed — no Stripe ID, no cancellation needed');
    }

    const deleteResponse = await UserModel.deleteOne({
      userId: { $in: getEncryptedUserIdCandidates(userId) },
    });

    subscriptionEventsTotal.inc({ event: 'unsubscribe' });
    logger.info({ event: 'user_deleted_from_db', userId }, 'User record deleted');

    return deleteResponse;
  }

  static async setUserPlaylistId(userId, playListId) {
    const user = await this.getUser(userId);
    user.playListId = playListId;
    return user.save();
  }

  static async setStripeId(userId, stripeId) {
    const user = await this.getUser(userId);
    user.stripeId = stripeId;
    return user.save();
  }

  static async restorePlaylistOptions(userId) {
    const user = await this.getUser(userId);

    user.playlistOptions = {
      seeds: ['ST', 'ST', 'MT', 'MT', 'MT'],
      acousticness: [10, 90],
      danceability: [10, 90],
      energy: [10, 90],
      instrumentalness: [10, 90],
      popularity: [50, 100],
      valence: [10, 90],
    };

    return user.save();
  }

  static async updatePlaylistOptions(userId, options) {
    const user = await this.getUser(userId);
    user.playlistOptions = options;
    return user.save();
  }
}

module.exports = UserController;
