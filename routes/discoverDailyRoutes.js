const bodyparser = require('body-parser');
const express = require('express');

const UserController = require('../controllers/userController');
const SpotifyHelper = require('../helpers/spotifyHelper');

const router = express.Router();
const app = express();

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

async function validate(userId, accessToken) {
    const user = await SpotifyHelper.getMe(accessToken);
    return user.id === userId;
}

async function isAdmin(userId, refreshToken) {
    if (userId !== '56qvpj5zn6okifdhfoaae6vwc') return false;

    const accessToken = await SpotifyHelper.getNewAccessToken(refreshToken);
    return validate(userId, accessToken);
}

router.get('/', function (req, res) {
    res.send('You hit playlist gen');
})

router.post('/force', async function (req, res) {
    const { userId, refreshToken } = req.body;
    if (!isAdmin(userId, refreshToken)) {
        return res.send('Invalid credentials');
    }

    const users = await UserController.getAllUsers();
    SpotifyHelper.updatePlaylists(users);
    res.send('Playlist Generation has been started');
});

router.post('/count', async function (req, res) {
    const { userId, refreshToken } = req.body;
    if (!isAdmin(userId, refreshToken)) {
        return res.send('Invalid credentials');
    }

    const users = await UserController.getAllUsers();
    res.send(`Total users: ${users.length}`);
})

router.post('/users', async function (req, res) {
    const { userId, refreshToken } = req.body;
    if (!isAdmin(userId, refreshToken)) {
        return res.send('Invalid credentials');
    }

    const users = await UserController.getAllUsers();
    res.send({users});
})

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
    const { userId, accessToken } = req.body;
    if (!(await validate(userId, accessToken))) {
        res.send({ success: false });
    }

    await UserController.deleteUser(req.body.userId);
    res.send({ success: true });
})

module.exports = router;