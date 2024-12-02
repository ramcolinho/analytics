const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const http = require('http');
const path = require('path');

const { PORT, SOCKET_OPTIONS } = require('./src/config/config');
const { startServer } = require('./src/utils/portManager');
const setupSocket = require('./src/socket/socketHandler');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, SOCKET_OPTIONS);

setupSocket(io);
startServer(server, PORT);