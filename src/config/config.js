module.exports = {
    PORT: process.env.PORT || 10000,
    MOCK_API_URL: 'https://673af0d9339a4ce44519d21a.mockapi.io/bromcom-analytics/v1/analytics',
    CORS_OPTIONS: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    SOCKET_OPTIONS: {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
        transports: ['polling', 'websocket'],
        pingInterval: 10000,
        pingTimeout: 5000
    }
};
