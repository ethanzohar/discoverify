const UserModel = require('../models/userSchema');

class UserController {
  static async getUser(userId) {
    return UserModel.findOne({ userId });
  }

  static async getAllUsers() {
    return UserModel.find();
  }

  static async createUser(userId, refreshToken) {
    return UserModel.create({ userId, refreshToken });
  }

  static async deleteUser(userId) {
    return UserModel.deleteOne({ userId });
  }

  static async setUserPlaylistId(userId, playListId) {
    const user = await this.getUser(userId);
    user.playListId = playListId;
    return user.save();
  }

  static async restorePlaylistOptions(userId) {
    const user = await this.getUser(userId);

    user.playlistOptions = {
      acousticness: [0, 100],
      danceability: [0, 100],
      energy: [0, 100],
      instrumentalness: [0, 100],
      popularity: [50, 100],
      valence: [0, 100]
    }

    return user.save();
  }

  static async updatePlaylistOptions(userId, options) {
    const user = await this.getUser(userId);
    user.playlistOptions = options;
    return user.save();
  }
}

module.exports = UserController;