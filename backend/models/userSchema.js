const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    refreshToken: {type: String, required: true, unique: true},
    playlistId: { type: String, unique: true },
    lastUpdated: { type: Date },
    playlistOptions: {
        seeds: { type: [String], default: ['ST', 'ST', 'MT', 'MT', 'MT']},
        acousticness: { type: [Number, Number], default: [0, 100] },
        danceability: { type: [Number, Number], default: [0, 100] },
        energy: { type: [Number, Number], default: [0, 100] },
        instrumentalness: { type: [Number, Number], default: [0, 100] },
        popularity: { type: [Number, Number], default: [50, 100] },
        valence: { type: [Number, Number], default: [0, 100] },
    }
});

const userModel = mongoose.model('users', userSchema, 'users');

module.exports = userModel;