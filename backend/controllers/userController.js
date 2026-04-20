const UserModel = require('../models/userSchema');
const SpotifyHelper = require('../helpers/spotifyHelper');
const StripeHelper = require('../helpers/stripeHelper');
const {
  encryptUserId,
  getEncryptedUserIdCandidates,
} = require('../helpers/userIdCrypto');

class UserController {
  static async subscribeUser(userId, refreshToken, options, stripeId = null) {
    let user = await UserController.getUser(userId);

    if (user) {
      user.refreshToken = refreshToken;
      if (stripeId !== null) {
        user.stripeId = stripeId;
      }
      await user.save();
    } else {
      user = await UserController.createUser(
        userId,
        refreshToken,
        options,
        stripeId
      );
      await SpotifyHelper.updatePlaylist(user, null);
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
      } catch (err) {
        if (
          err.type !== 'StripeInvalidRequestError' ||
          err.raw.code !== 'resource_missing'
        ) {
          throw err;
        } else {
          console.error(`[STRIPE_RESOURCE_MISSING] stripeId="${user.stripeId}" userId="${userId}" — subscription not found in Stripe, user will be deleted from DB but Stripe subscription was NOT cancelled`);
          console.error(JSON.stringify(err));
        }
      }
    } else {
      console.log(`Unable to find user or user Stripe ID in "deleteUser"`);
      console.log(JSON.stringify(user));
    }

    const deleteResponse = await UserModel.deleteOne({
      userId: { $in: getEncryptedUserIdCandidates(userId) },
    });

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
