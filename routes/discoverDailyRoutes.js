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
    SpotifyHelper.updatePlaylists(users);
    res.send('Playlist Generation has been started');
})

router.get('/getUser/:userId', async function(req, res) {
    const { userId, playlistId } = await UserController.getUser(req.params.userId);
    if (userId) {
        res.status(200).send({ userId, playlistId });
    } else {
        res.status(403).send({ success: false });
    }
});

router.post('/subscribe', async function(req, res) {
    const { userId, refreshToken } = req.body;

    let user = await UserController.getUser(userId);
    if (user) {
        user.refreshToken = refreshToken;
        user.save();
    } else {
        user = await UserController.createUser(userId, refreshToken);
    }

    res.send(user);
})

router.post('/unsubscribe', async function(req, res) {
    const {userId, accessToken } = req.body;
    const user = await SpotifyHelper.getMe(accessToken);

    if (user.id === userId) {
        await UserController.deleteUser(req.body.userId);
        res.send({ success: true });
    } else {
        res.send({ success: false })
    }
})

module.exports = router;