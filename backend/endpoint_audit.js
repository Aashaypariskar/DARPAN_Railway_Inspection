const http = require('http');
const fs = require('fs');

const endpoints = [
    { path: '/health', method: 'GET', expected: 200 },
    { path: '/api/health', method: 'GET', expected: 200 },
    { path: '/api/common/trains', method: 'GET', expected: 401 },
    { path: '/api/monitoring/stats', method: 'GET', expected: 401 },
    { path: '/api/reports/summary', method: 'GET', expected: 401 },
    { path: '/api/non-existent-endpoint', method: 'GET', expected: 404 }
];

async function checkEndpoint(ep) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: ep.path,
            method: ep.method,
            timeout: 2000
        };

        const req = http.request(options, (res) => {
            resolve({
                path: ep.path,
                method: ep.method,
                status: res.statusCode,
                passed: res.statusCode === ep.expected
            });
        });

        req.on('error', (err) => {
            resolve({
                path: ep.path,
                method: ep.method,
                error: err.message,
                passed: false
            });
        });

        req.end();
    });
}

async function auditEndpoints() {
    console.log('--- STARTING ENDPOINT RUNTIME AUDIT ---');
    const results = [];

    for (const ep of endpoints) {
        const result = await checkEndpoint(ep);
        results.push(result);
        console.log(`[TEST] ${ep.method} ${ep.path} -> ${result.status || 'ERROR'} (${result.passed ? 'PASS' : 'FAIL'})`);
    }

    fs.writeFileSync('endpoint_audit_results.json', JSON.stringify(results, null, 2));
    console.log('--- ENDPOINT AUDIT COMPLETE ---');
}

auditEndpoints();
