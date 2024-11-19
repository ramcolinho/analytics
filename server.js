const express = require('express');
const app = express();
const server = require('http').createServer(app);
const { Server } = require('socket.io');
const axios = require('axios');
const path = require('path');

// CORS middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

app.use(express.static('public'));
app.use(express.json());

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: true
    },
    allowEIO3: true,
    transports: ['polling', 'websocket'],
    pingInterval: 10000,
    pingTimeout: 5000,
    upgradeTimeout: 30000,
    allowUpgrades: true
});

const MOCK_API_URL = 'https://673af0d9339a4ce44519d21a.mockapi.io/bromcom-analytics/v1/analytics';

io.on('connection', async (socket) => {
    console.log('Bir kullanıcı bağlandı', socket.id);

    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı:', socket.id);
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    try {
        const response = await axios.get(MOCK_API_URL);
        socket.emit('initialData', response.data);
    } catch (error) {
        console.error('Veri çekme hatası:', error);
        socket.emit('error', { message: 'Veri çekme hatası' });
    }

    socket.on('updateData', async (data) => {
        try {
            const response = await axios.post(MOCK_API_URL, data);
            io.emit('dataUpdated', response.data);
        } catch (error) {
            console.error('Veri güncelleme hatası:', error);
            socket.emit('error', { message: 'Veri güncelleme hatası' });
        }
    });

    socket.on('changeTab', (tab) => {
        io.emit('tabChanged', tab);
    });
});

// Ana route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Development için
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server http://localhost:${PORT} adresinde çalışıyor`);
    });
}

module.exports = server;