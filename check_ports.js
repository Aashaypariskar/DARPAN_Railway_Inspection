const http = require('http');

const check = (port) => {
    const options = {
        hostname: 'localhost',
        port: port,
        path: '/api/health',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log(`Port ${port}: Status ${res.statusCode}, Body: ${data}`);
        });
    });

    req.on('error', (e) => {
        console.log(`Port ${port}: Error ${e.message}`);
    });

    req.end();
};

check(8080);
check(8081);
