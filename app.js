const cron = require('node-cron');
const express = require('express')
const http = require('http');
const bodyParser = require('body-parser');

const SpotifyHelper = require('./helpers/SpotifyHelper');
const playlistGenRouter = require('./routes/playlistGenRoutes');

const app = express();
const server = http.createServer(app);
const port = 3000

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? `pipe ${addr}`
    : `port ${addr.port}`;
  console.log(`Listening on ${bind}`);
}

server.listen(port);
server.on('listening', onListening);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/playlistGen', playlistGenRouter);

app.get('/', (req, res) => {
  res.send('Wow, you hit the server')
})

cron.schedule('0 6 * * *', () => {
    console.log("Starting job");
    SpotifyHelper.updatePlaylist();
});