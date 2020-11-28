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
}

module.exports = UserController;