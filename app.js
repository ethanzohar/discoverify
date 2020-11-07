const cron = require('node-cron');
const SpotifyHelper = require('./Helpers/SpotifyHelper');

cron.schedule('0 6 * * *', () => {
    console.log("Starting job");
    SpotifyHelper.updatePlaylist();
});