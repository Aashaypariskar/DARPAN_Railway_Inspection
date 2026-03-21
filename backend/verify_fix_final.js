const fs = require('fs');
const path = require('path');

process.env.USE_SQLITE = 'false';
process.env.DB_HOST = '3.110.16.111';
process.env.DB_NAME = 'inspection_db';
process.env.DB_USER = 'railway_user';
process.env.DB_PASS = 'Railway@123';
process.env.DB_PORT = '3307';

const sequelize = require('./config/db');
const ReportQueryService = require('./services/ReportQueryService');

async function verifyFix() {
    try {
        await sequelize.authenticate();
        console.log('Connected to MySQL.');

        const filters = {
            fromDate: '2020-01-01',
            toDate: '2027-01-01',
            moduleType: 'CAI',
            page: 1,
            limit: 10
        };

        const result = await ReportQueryService.getRecentSessions(filters);

        console.log(`\n--- Verification Result for CAI ---`);
        console.log(`Total Found: ${result.total}`);
        result.data.forEach(r => {
            console.log(`Session: ${r.session_id} | Inspector: ${r.inspector_name} | Date: ${r.createdAt}`);
        });

        if (result.total > 0) {
            console.log('\nSUCCESS: CAI sessions are now visible in report queries.');
        } else {
            console.log('\nFAILURE: CAI sessions still not found in report queries.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verifyFix();
