const sequelize = require('./config/db');
const { QueryTypes } = require('sequelize');
const fs = require('fs');

async function runDiagnostics() {
    try {
        console.log('--- Running Diagnostics ---');

        console.log('--- Scanning for March 5 CAI Data ---');

        const march5Sessions = await sequelize.query(`
            SELECT id, status, createdAt, updatedAt 
            FROM cai_sessions 
            WHERE createdAt >= '2026-03-05' OR updatedAt >= '2026-03-05'
        `, { type: QueryTypes.SELECT });

        const march5Answers = await sequelize.query(`
            SELECT DISTINCT session_id 
            FROM cai_answers 
            WHERE createdAt >= '2026-03-05' OR updatedAt >= '2026-03-05'
        `, { type: QueryTypes.SELECT });

        const results = {
            march5Sessions,
            march5Answers
        };

        fs.writeFileSync('diagnose_march5.json', JSON.stringify(results, null, 2));
        console.log('Diagnostics saved to diagnose_march5.json');
        process.exit(0);
    } catch (err) {
        console.error('Diagnostic failed:', err);
        process.exit(1);
    }
}

runDiagnostics();
