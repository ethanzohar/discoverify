const bodyparser = require('body-parser');
const express = require('express');

const UserController = require('../controllers/userController');
const SpotifyHelper = require('../helpers/spotifyHelper');

const router = express.Router();
const app = express();

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

router.get('/', function (req, res) {
    res.send('You hit playlist gen');
})

router.get('/force', async function (req, res) {
    const users = await UserController.getAllUsers();
    // console.log(users);
    SpotifyHelper.updatePlaylists(users);
    res.send('Playlist Generation has been started');
});

router.get('/count', async function (req, res) {
    const users = await UserController.getAllUsers();
    res.send(`Total users: ${users.length}`);
})

router.get('/users', async function (req, res) {
    const users = await UserController.getAllUsers();
    res.send({users});
})

router.post('/accessToken', async function(req, res) {
    const accessToken = await SpotifyHelper.getNewAccessToken(req.body.refreshToken);
    res.send({ accessToken });
});

router.get('/getUser/:userId', async function(req, res) {
    const user = await UserController.getUser(req.params.userId);
    if (user && user.userId) {
        res.status(200).send({ userId: user.userId, playlistId: user.playlistId });
    } else {
        res.status(200).send({ success: false });
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

    res.send({ user });
})

router.post('/unsubscribe', async function(req, res) {
    const {userId, accessToken } = req.body;
    console.log(accessToken);
    const user = await SpotifyHelper.getMe(accessToken);
    console.log(user);
    console.log(userId, user.id);
    console.log(userId === user.id);

    if (user.id === userId) {
        await UserController.deleteUser(req.body.userId);
        res.send({ success: true });
    } else {
        res.send({ success: false })
    }
})

module.exports = router;