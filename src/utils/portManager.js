const { exec } = require('child_process');

function killProcessOnPort(port) {
    return new Promise((resolve, reject) => {
        const command = `lsof -i :${port} -t`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                resolve();
                return;
            }

            const pids = stdout.trim().split('\n');
            
            if (pids.length && pids[0]) {
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

async function startServer(server, port) {
    try {
        await killProcessOnPort(port);
        server.listen(port, () => {
            console.log(`Server running on port ${port}`);
        }).on('error', async (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Port ${port} is busy. Trying to free it...`);
                await killProcessOnPort(port);
                startServer(server, port);
            } else {
                console.error('Server error:', err);
            }
        });
    } catch (error) {
        console.error('Error starting server:', error);
    }
}

module.exports = {
    killProcessOnPort,
    startServer
};
