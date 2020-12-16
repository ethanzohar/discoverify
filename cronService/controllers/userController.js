const UserModel = require('../models/userSchema');

class UserController {
  static async getUser(userId) {
    return UserModel.findOne({ userId });
  }

  static async getAllUsers() {
    return UserModel.find();
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
}

module.exports = UserController;
