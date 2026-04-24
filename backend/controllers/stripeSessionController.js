const stripeSessionModel = require('../models/stripeSessionSchema');

class StripeSessionController {
  static async getSessionBySessionId(sessionId) {
    return stripeSessionModel.findOne({ sessionId });
  }

  static async getAllSessions() {
    return stripeSessionModel.find();
  }

  static async createSession(sessionId, userId, refreshToken, playlistOptions) {
    return stripeSessionModel.create({
      sessionId,
      userId,
      refreshToken,
      playlistOptions,
    });
  }

  static async deleteSession(sessionId) {
    return stripeSessionModel.deleteOne({
      sessionId,
    });
  }
}

module.exports = StripeSessionController;
