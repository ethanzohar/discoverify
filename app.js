const cron = require('node-cron');
const express = require('express')

const SpotifyHelper = require('./Helpers/SpotifyHelper');

const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/forcePlaylistGeneration', (req, res) => {
    SpotifyHelper.updatePlaylist();
    res.send('Playlist Generation has been started');
})

app.listen(port, () => {
  console.log(`Example app listening at port: ${port}`)
})

cron.schedule('0 6 * * *', () => {
    console.log("Starting job");
    SpotifyHelper.updatePlaylist();
});