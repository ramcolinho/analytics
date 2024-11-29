  // server.js
const express = require('express');
const app = express();
const { Server } = require('socket.io');
const cors = require('cors');
const http = require('http');
const axios = require('axios');
const path = require('path');
const { exec } = require('child_process');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    transports: ['polling', 'websocket'],
    pingInterval: 10000,   
    pingTimeout: 5000
});

const PORT = process.env.PORT || 10000;
const MOCK_API_URL = 'https://673af0d9339a4ce44519d21a.mockapi.io/bromcom-analytics/v1/analytics';

function killProcessOnPort(port) {
    return new Promise((resolve, reject) => {
        const command = `lsof -i :${port} -t`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                // Port zaten boşsa veya lsof komutu bulunamazsa
                resolve();
                return;
            }

            const pids = stdout.trim().split('\n');
            
            if (pids.length && pids[0]) {
                // Her PID için kill komutu çalıştır
                Promise.all(pids.map(pid => {
                    return new Promise((resolveKill) => {
                        exec(`kill -9 ${pid}`, () => resolveKill());
                    });
                })).then(() => {
                    console.log(`Process(es) on port ${port} were killed`);
                    resolve();
                }).catch(reject);
            } else {
                resolve();
            }
        });
    });
}

async function startServer(port) {
    try {
        await killProcessOnPort(port);
        server.listen(port, () => {
            console.log(`Server running on port ${port}`);
        }).on('error', async (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Port ${port} is busy. Trying to free it...`);
                await killProcessOnPort(port);
                startServer(port);
            } else {
                console.error('Server error:', err);
            }
        });
    } catch (error) {
        console.error('Error starting server:', error);
    }
}

io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);

    try {
        const response = await axios.get(MOCK_API_URL);
        socket.emit('initialData', response.data);
    } catch (error) {
        console.error('Error:', error.message);
    }

    socket.on('updateData', async (data) => {
        try {
            const response = await axios.post(MOCK_API_URL, data);
            io.emit('dataUpdated', response.data);
        } catch (error) {
            console.error('Error:', error.message);
        }
    });

    socket.on('editData', async (data) => {
        try {
            const resp = await axios.get(MOCK_API_URL);
            console.log('data', data);
            const getSingleData =  resp.data.find((item) => item.additionalData.sessionId === data.additionalData.sessionId && item.additionalData.cardType === data.additionalData.cardType);
            if(getSingleData){
                const response = await axios.put(MOCK_API_URL + '/' + getSingleData.id, data);
                io.emit('dataUpdated', response.data);
            } else {
                const response = await axios.post(MOCK_API_URL, data);
                io.emit('dataUpdated', response.data);
            }
        } catch (error) {
            console.error('Error:', error.message);
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
            console.error('Error:', error.message);
        }
    });
});

startServer(PORT);
