const mongoose = require('mongoose');

const { Schema } = mongoose;

const stripeSessionSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  refreshToken: { type: String, required: true, unique: false },
  playlistOptions: {
    seeds: { type: [String], default: ['ST', 'ST', 'MT', 'MT', 'MT'] },
    acousticness: { type: [Number, Number], default: [10, 90] },
    danceability: { type: [Number, Number], default: [10, 90] },
    energy: { type: [Number, Number], default: [10, 90] },
    instrumentalness: { type: [Number, Number], default: [10, 90] },
    popularity: { type: [Number, Number], default: [50, 100] },
    valence: { type: [Number, Number], default: [10, 90] },
  },
});

const stripeSessionModel = mongoose.model(
  'stripeSessions',
  stripeSessionSchema,
  'stripeSessions'
);

module.exports = stripeSessionModel;
