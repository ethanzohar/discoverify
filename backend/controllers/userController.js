const CryptoJS = require('crypto-js');
const UserModel = require('../models/userSchema');
const SpotifyHelper = require('../helpers/spotifyHelper');
const StripeHelper = require('../helpers/stripeHelper');

class UserController {
  static async subscribeUser(userId, refreshToken, options, stripeId = null) {
    let user = await UserController.getUser(userId);

    if (user) {
      user.refreshToken = refreshToken;
      user.stripeId = stripeId;
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
      userId: CryptoJS.AES.encrypt(
        userId,
        CryptoJS.enc.Base64.parse(process.env.SPOTIFY_API_CLIENT_SECRET),
        { mode: CryptoJS.mode.ECB }
      ).toString(),
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
      userId: CryptoJS.AES.encrypt(
        userId,
        CryptoJS.enc.Base64.parse(process.env.SPOTIFY_API_CLIENT_SECRET),
        { mode: CryptoJS.mode.ECB }
      ).toString(),
      refreshToken,
      playlistOptions,
      stripeId,
    });
  }

  static async deleteUser(userId) {
    const user = await UserController.getUser(userId);

    if (user.stripeId) {
      try {
        await StripeHelper.cancelStripeSubscription(user.stripeId);
      } catch (err) {
        if (
          err.type !== 'StripeInvalidRequestError' ||
          err.raw.code !== 'resource_missing'
        ) {
          throw err;
        }
      }
    }

    const deleteResponse = await UserModel.deleteOne({
      userId: CryptoJS.AES.encrypt(
        userId,
        CryptoJS.enc.Base64.parse(process.env.SPOTIFY_API_CLIENT_SECRET),
        { mode: CryptoJS.mode.ECB }
      ).toString(),
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
