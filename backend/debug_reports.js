const fs = require('fs');
const path = require('path');

// Manually parse .env
try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const env = fs.readFileSync(envPath, 'utf8');
        env.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) process.env[key.trim()] = value.trim();
        });
    }
} catch (e) { }

const sequelize = require('./config/db');
const { QueryTypes } = require('sequelize');

async function debugData() {
    try {
        await sequelize.authenticate();
        console.log('Connected successfully.');

        // Step 1 & 4 Adaptation: Since there is no single 'inspection_sessions' table, 
        // we check the individual module tables.
        console.log('\n--- STEP 1 & 4 (ADAPTED): OPERATIONAL DATA ---');
        const sessionTables = {
            'CAI': 'CaiSessions',
            'SICKLINE': 'SickLineSessions',
            'PITLINE': 'PitLineSessions',
            'WSP': 'WspSessions',
            'COMMISSIONARY': 'CommissionarySessions'
        };

        for (const [module, table] of Object.entries(sessionTables)) {
            try {
                const results = await sequelize.query(`SELECT id, status, createdAt FROM ${table} ORDER BY createdAt DESC LIMIT 5;`, { type: QueryTypes.SELECT });
                results.forEach(r => console.log(`Module: ${module} | ID: ${r.id} | Status: ${r.status} | CreatedAt: ${r.createdAt || r.created_at}`));
            } catch (e) {
                console.log(`${table}: Table not found or error.`);
            }
        }

        // Step 2: Verify Reporting Table Content
        console.log('\n--- STEP 2: REPORTING TABLE CONTENT ---');
        try {
            const results = await sequelize.query(`SELECT module_type, source_session_id, progress_percentage FROM reporting_sessions ORDER BY projected_at DESC LIMIT 10;`, { type: QueryTypes.SELECT });
            results.forEach(r => console.log(`Module: ${r.module_type} | SourceID: ${r.source_session_id} | Progress: ${r.progress_percentage}%`));
        } catch (e) {
            console.log('reporting_sessions: Error.', e.message);
        }

        // Step 3: Compare Module Distribution
        console.log('\n--- STEP 3: MODULE DISTRIBUTION ---');
        console.log('Inspection (Operational):');
        for (const [module, table] of Object.entries(sessionTables)) {
            try {
                const results = await sequelize.query(`SELECT COUNT(*) as count FROM ${table};`, { type: QueryTypes.SELECT });
                console.log(`${module} (${table}): ${results[0].count}`);
            } catch (e) { }
        }

        console.log('\nReporting Table:');
        try {
            const results = await sequelize.query(`SELECT module_type, COUNT(*) as count FROM reporting_sessions GROUP BY module_type;`, { type: QueryTypes.SELECT });
            results.forEach(r => console.log(`${r.module_type}: ${r.count}`));
        } catch (e) { }

        process.exit(0);
    } catch (err) {
        console.error('Debug failed:', err);
        process.exit(1);
    }
}

debugData();
