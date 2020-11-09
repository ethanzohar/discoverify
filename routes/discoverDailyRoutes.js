const bodyparser = require('body-parser');
const express = require('express');

const SpotifyHelper = require('../helpers/SpotifyHelper');
const UserController = require('../controllers/userController');

const router = express.Router();
const app = express();

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

router.get('/', function (req, res) {
    res.send('You hit playlist gen');
})

router.get('/force', async function (req, res) {
    const users = await UserController.getAllUsers();
    console.log(users);
    SpotifyHelper.updatePlaylists(users);
    res.send('Playlist Generation has been started');
})

router.post('/subscribe', async function(req, res) {
    const { userId, refreshToken } = req.body;

    let user = await UserController.getUser(userId);
    if (user) {
        user.refreshToken = refreshToken;
        user.save();
    } else {
        user = await UserController.createUser(userId, refreshToken);
    }
    console.log(user);
    res.send(req.body);
})

router.post('/unsubscribe', async function(req, res) {
    await UserController.deleteUser(req.body.userId);
    res.send({ success: true });
})

module.exports = router;