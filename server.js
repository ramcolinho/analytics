  // server.js
  const express = require('express');
  const app = express();
  const { Server } = require('socket.io');
  const cors = require('cors');
  const http = require('http');
  const axios = require('axios');
  const path = require('path');
  
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
  
  server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
  });
