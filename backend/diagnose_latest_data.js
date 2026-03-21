const sequelize = require('./config/db');
const { QueryTypes } = require('sequelize');
const fs = require('fs');

async function runDiagnostics() {
    try {
        console.log('--- Running Latest Diagnostics ---');

        const latestAnswers = await sequelize.query(`
            SELECT id, session_id, createdAt, updatedAt 
            FROM cai_answers 
            ORDER BY id DESC 
            LIMIT 10
        `, { type: QueryTypes.SELECT });

        const latestSessions = await sequelize.query(`
            SELECT id, status, createdAt, updatedAt 
            FROM cai_sessions 
            ORDER BY id DESC 
            LIMIT 10
        `, { type: QueryTypes.SELECT });

        const results = {
            latestAnswers,
            latestSessions
        };

        fs.writeFileSync('diagnose_latest.json', JSON.stringify(results, null, 2));
        console.log('Diagnostics saved to diagnose_latest.json');
        process.exit(0);
    } catch (err) {
        console.error('Diagnostic failed:', err);
        process.exit(1);
    }
}

runDiagnostics();
