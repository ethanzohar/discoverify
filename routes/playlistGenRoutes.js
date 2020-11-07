const bodyparser = require('body-parser');
const express = require('express');

const SpotifyHelper = require('../helpers/SpotifyHelper');

const router = express.Router();
const app = express();

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

router.get('/', function (req, res) {
    res.send('You hit playlist gen');
})

router.get('/forcePlaylistGeneration', function (req, res) {
    SpotifyHelper.updatePlaylist();
    res.send('Playlist Generation has been started');
})

router.post('/signup', function(req, res) {
    res.send(req.body);
})

module.exports = router;