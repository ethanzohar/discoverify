const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');

const discoverDailyRouter = require('./routes/discoverDailyRoutes');

const app = express();
const server = http.createServer(app);
const port = 8081;

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
  console.log(`Listening on ${bind}`);
}

server.listen(port);
server.on('listening', onListening);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/discover-daily', discoverDailyRouter);

const frontend = path.resolve(
  `${__dirname}../../frontend/deployedBuild/index.html`
);
app.use(express.static(path.resolve(`${__dirname}/../frontend/deployedBuild`)));

app.get('*', (req, res) => {
  res.sendFile(frontend);
});

mongoose.connect('mongodb://localhost:27017/playlist-generator', {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});

const { connection } = mongoose;

connection.on('connected', () => {
  console.log('MongoDB database connected');
});

connection.on('error', () => {
  console.log('MongoDB Connection Error');
});
