
const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');
const SessionReportService = require('./services/SessionReportService');

async function testDefects(reportingId) {
    try {
        const service = new SessionReportService();
        const defects = await service.getSessionDefects(reportingId);
        console.log(`Defects for reportingId ${reportingId}:`);
        console.log(JSON.stringify(defects[0], null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

testDefects(process.argv[2] || '3');
