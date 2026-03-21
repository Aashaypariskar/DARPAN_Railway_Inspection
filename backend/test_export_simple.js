const ReportController = require('./controllers/ReportController');

async function runTest() {
    console.log('--- TESTING CSV EXPORT ---');
    const resCsv = {
        statusCode: 200,
        headers: {},
        status: function(s) { this.statusCode = s; return this; },
        json: function(j) { console.log('JSON Response:', j); return this; },
        header: function(h, v) { this.headers[h] = v; return this; },
        setHeader: function(h, v) { this.headers[h] = v; return this; },
        attachment: function(f) { this.attachmentFile = f; return this; },
        send: function(d) { console.log('CSV Data received (first 100 chars):', d.toString().substring(0, 100)); return this; },
        end: function() { this.ended = true; }
    };

    const reqCsv = {
        query: {
            fromDate: '2020-01-01',
            toDate: '2030-01-01',
            moduleType: 'ALL'
        }
    };

    try {
        await ReportController.exportCSV(reqCsv, resCsv);
        console.log('CSV Export Status:', resCsv.statusCode);
    } catch (err) {
        console.error('CSV EXPORT CRASHED:', err);
    }

    console.log('\n--- TESTING EXCEL EXPORT ---');
    const resExcel = {
        statusCode: 200,
        headers: {},
        status: function(s) { this.statusCode = s; return this; },
        json: function(j) { console.log('JSON Response:', j); return this; },
        header: function(h, v) { this.headers[h] = v; return this; },
        setHeader: function(h, v) { this.headers[h] = v; return this; },
        attachment: function(f) { this.attachmentFile = f; return this; },
        send: function(d) { console.log('Excel Data received (length):', d ? d.length : 0); return this; },
        write: function(d) { console.log('Excel Stream write length:', d ? d.length : 0); return this; },
        end: function() { this.ended = true; console.log('Response ended'); }
    };

    // ExcelJS write(res) calls write and end on the stream
    // We need to mock res as a writable stream partially
    resExcel.on = () => {};
    resExcel.once = () => {};
    resExcel.emit = () => {};

    try {
        await ReportController.exportExcel(reqCsv, resExcel);
        console.log('Excel Export Status:', resExcel.statusCode);
    } catch (err) {
        console.error('Excel EXPORT CRASHED:', err);
    }

    process.exit(0);
}

runTest();
