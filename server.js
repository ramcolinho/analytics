const express = require('express');
const app = express();
const { Server } = require('socket.io');
const cors = require('cors');
const http = require('http');
const axios = require('axios');
const path = require('path');

// Express middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' 
            ? process.env.ALLOWED_ORIGIN || '*'
            : 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Constants
const PORT = process.env.PORT || 3000;
const MOCK_API_URL = 'https://673af0d9339a4ce44519d21a.mockapi.io/bromcom-analytics/v1/analytics';

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket event handlers
io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);

    // Send initial data
    try {
        const response = await axios.get(MOCK_API_URL);
        socket.emit('initialData', response.data);
    } catch (error) {
        console.error('Initial data fetch error:', error.message);
    }

    // Handle data updates
    socket.on('updateData', async (data) => {
        try {
            const response = await axios.post(MOCK_API_URL, data);
            io.emit('dataUpdated', response.data);
        } catch (error) {
            console.error('Update error:', error.message);
            socket.emit('error', 'Failed to update data');
        }
    });

    // Handle tab changes
    socket.on('changeTab', (tab) => {
        io.emit('tabChanged', tab);
    });

    // Handle data requests
    socket.on('getData', async () => {
        try {
            const response = await axios.get(MOCK_API_URL);
            socket.emit('initialData', response.data);
        } catch (error) {
            console.error('Data fetch error:', error.message);
            socket.emit('error', 'Failed to fetch data');
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = server;