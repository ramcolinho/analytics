const express = require('express');
const app = express();
const httpServer = require('http').createServer(app);
const { Server } = require('socket.io');
const axios = require('axios');
const path = require('path');

// CORS middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Socket.IO setup - Tek bir io instance
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

const MOCK_API_URL = 'https://673af0d9339a4ce44519d21a.mockapi.io/bromcom-analytics/v1/analytics';

// Ana sayfa route'u
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO bağlantı yönetimi
io.on('connection', async (socket) => {
    console.log('Bir kullanıcı bağlandı');

    try {
        const response = await axios.get(MOCK_API_URL);
        socket.emit('initialData', response.data);
    } catch (error) {
        console.error('Veri çekme hatası:', error);
    }

    socket.on('updateData', async (data) => {
        try {
            const payload = data;
            const response = await axios.post(MOCK_API_URL, payload);
            io.emit('dataUpdated', response.data);
        } catch (error) {
            console.error('Veri güncelleme hatası:', error);
        }
    });

    socket.on('changeTab', (tab) => {
        io.emit('tabChanged', tab);
    });

    socket.on('getData', async () => {
        try {
            const response = await axios.get(MOCK_API_URL);
            socket.emit('initialData', response.data);
        } catch (error) {
            console.error('Veri çekme hatası:', error);
        }
    });

    // Disconnect eventi
    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı');
    });
});

// Lokal geliştirme için
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => {
        console.log(`Server http://localhost:${PORT} adresinde çalışıyor`);
    });
}

// Vercel için export
module.exports = httpServer;