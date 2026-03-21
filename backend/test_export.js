const ReportController = require('./controllers/ReportController');
const httpMocks = require('node-mocks-http');

async function testExportCSV() {
    console.log('Testing exportCSV...');
    const req = httpMocks.createRequest({
        method: 'GET',
        url: '/api/reports/export/csv',
        query: {
            fromDate: '2020-01-01',
            toDate: '2030-01-01',
            moduleType: 'ALL'
        }
    });
    const res = httpMocks.createResponse();

    try {
        await ReportController.exportCSV(req, res);
        console.log('Status Code:', res.statusCode);
        console.log('Content-Type:', res.getHeader('Content-Type'));
        if (res.statusCode !== 200) {
            console.log('Error Body:', res._getData());
        } else {
            console.log('CSV Data Length:', res._getData().length);
        }
    } catch (err) {
        console.error('EXPORT FAILED:', err);
    }
}

async function testExportExcel() {
    console.log('\nTesting exportExcel...');
    const req = httpMocks.createRequest({
        method: 'GET',
        url: '/api/reports/export/excel',
        query: {
            fromDate: '2020-01-01',
            toDate: '2030-01-01',
            moduleType: 'ALL'
        }
    });
    const res = httpMocks.createResponse();

    try {
        await ReportController.exportExcel(req, res);
        console.log('Status Code:', res.statusCode);
        console.log('Content-Type:', res.getHeader('Content-Type'));
        if (res.statusCode !== 200) {
            console.log('Error Body:', res._getData());
        } else {
            console.log('Excel Data length (Binary):', res._getData() ? 'Exists' : 'Empty');
        }
    } catch (err) {
        console.error('EXPORT FAILED:', err);
    }
}

async function run() {
    // We need to wait for DB connection if any model initialization is needed, 
    // but ReportQueryService uses sequelize.query directly.
    await testExportCSV();
    await testExportExcel();
    process.exit(0);
}

run();
