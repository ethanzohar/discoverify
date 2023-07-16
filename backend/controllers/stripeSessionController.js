const stripeSessionModel = require('../models/stripeSessionSchema');
const StripeSession = require('../models/stripeSessionSchema');

class StripeSessionController {
  static async getSessionBySessionId(sessionId) {
    return StripeSession.findOne({ sessionId });
  }

  static async getAllSessions() {
    return StripeSession.find();
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
