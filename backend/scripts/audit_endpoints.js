const BASE_URL = 'http://localhost:8080/api';

async function auditEndpoints() {
    console.log('=== ENDPOINT RUNTIME AUDIT ===');
    const endpoints = [
        { path: '/health', method: 'GET', raw: true },
        { path: '/user-categories', method: 'GET' },
        { path: '/train-list?category_name=Amenity', method: 'GET' },
        { path: '/coach-list?category_name=Amenity', method: 'GET' },
        { path: '/inspection/defects', method: 'GET' },
        { path: '/reports/summary', method: 'GET' },
        { path: '/non-existent-test-404', method: 'GET' }
    ];

    let failures = 0;

    for (const ep of endpoints) {
        try {
            const url = ep.raw ? `http://localhost:8080${ep.path}` : `${BASE_URL}${ep.path}`;
            console.log(`Testing ${ep.method} ${url}...`);
            const res = await fetch(url, {
                method: ep.method
            });

            if (res.status === 500) {
                console.error(`  ❌ [500] CRITICAL ERROR at ${ep.path}`);
                failures++;
            } else if (res.status === 404 && ep.path !== '/non-existent-test-404') {
                console.warn(`  ⚠️  [404] NOT FOUND at ${ep.path}`);
                failures++;
            } else {
                console.log(`  ✅ [${res.status}] ${ep.path}`);
            }
        } catch (err) {
            console.error(`  ❌ [NETWORK] FAILED to reach ${ep.path}: ${err.message}`);
            failures++;
        }
    }

    console.log(`\nAudit complete. Failures: ${failures}`);
    if (failures === 0) {
        console.log('✅ ALL CRITICAL ENDPOINTS FUNCTIONAL');
        process.exit(0);
    } else {
        console.error('❌ ENDPOINT AUDIT FAILED — ISSUES DETECTED');
        process.exit(1);
    }
}

auditEndpoints();
