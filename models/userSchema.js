const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    refreshToken: {type: String, required: true, unique: true},
    playlistId: { type: String, unique: true },
});

const userModel = mongoose.model('users', userSchema, 'users');

module.exports = userModel;