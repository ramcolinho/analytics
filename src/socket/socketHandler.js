const analyticsService = require('../services/analyticsService');

function setupSocket(io) {
    io.on('connection', async (socket) => {
        console.log('Client connected:', socket.id);

        try {
            const data = await analyticsService.getInitialData();
            socket.emit('initialData', data);
        } catch (error) {
            console.error('Error:', error.message);
        }

        socket.on('updateData', async (data) => {
            try {
                const updatedData = await analyticsService.updateData(data);
                io.emit('dataUpdated', updatedData);
            } catch (error) {
                console.error('Error:', error.message);
            }
        });

        socket.on('editData', async (data) => {
            try {
                const editedData = await analyticsService.editData(data);
                io.emit('dataUpdated', editedData);
            } catch (error) {
                console.error('Error:', error.message);
            }
        });

        socket.on('changeTab', (tab) => {
            io.emit('tabChanged', tab);
        });

        socket.on('getData', async () => {
            try {
                const data = await analyticsService.getInitialData();
                socket.emit('initialData', data);
            } catch (error) {
                console.error('Error:', error.message);
            }
        });
    });
}

module.exports = setupSocket;
