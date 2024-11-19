const express = require('express');
const app = express();
const { Server } = require('socket.io');
const cors = require('cors');
const http = require('http');
const axios = require('axios');
const path = require('path');
app.use(cors());

const server = http.createServer(app);


app.use(express.static('public'));
app.use(express.json());

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
    },
    transports: ['polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});
// Static dosyaları serve et
app.use(express.static(path.join(__dirname, "public")));

// Ana sayfa route'u
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const MOCK_API_URL = 'https://673af0d9339a4ce44519d21a.mockapi.io/bromcom-analytics/v1/analytics';

// Socket.IO bağlantı yönetimi
io.on('connection', async (socket) => {
    console.log('Bir kullanıcı bağlandı');

    // Bağlantı kurulduğunda mevcut verileri gönder
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

});

// Server'ı başlat
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server http://localhost:${PORT} adresinde çalışıyor`);
    });
}

module.exports = server;