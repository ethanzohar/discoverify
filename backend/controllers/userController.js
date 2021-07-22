const CryptoJS = require('crypto-js');
const UserModel = require('../models/userSchema');

class UserController {
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

  static async createUser(userId, refreshToken, playlistOptions) {
    return UserModel.create({
      userId: CryptoJS.AES.encrypt(
        userId,
        CryptoJS.enc.Base64.parse(process.env.SPOTIFY_API_CLIENT_SECRET),
        { mode: CryptoJS.mode.ECB }
      ).toString(),
      refreshToken,
      playlistOptions,
    });
  }

  static async deleteUser(userId) {
    return UserModel.deleteOne({
      userId: CryptoJS.AES.encrypt(
        userId,
        CryptoJS.enc.Base64.parse(process.env.SPOTIFY_API_CLIENT_SECRET),
        { mode: CryptoJS.mode.ECB }
      ).toString(),
    });
  }

  static async setUserPlaylistId(userId, playListId) {
    const user = await this.getUser(userId);
    user.playListId = playListId;
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
