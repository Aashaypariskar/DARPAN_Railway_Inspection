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
        const dialect = sequelize.getDialect();
        console.log('Connected successfully to:', dialect);

        if (dialect === 'sqlite') {
            const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table';");
            console.log('Tables found:', tables.map(t => t.name).join(', '));
        } else {
            const [[tables]] = await sequelize.query("SHOW TABLES;");
            console.log('Tables found:', Object.keys(tables).join(', '));
        }

        // Operational counts
        console.log('\n--- OPERATIONAL SESSION COUNTS ---');
        const sessionTables = ['PitLineSessions', 'WspSessions', 'CommissionarySessions', 'SickLineSessions', 'CaiSessions'];
        for (const table of sessionTables) {
            try {
                const results = await sequelize.query(`SELECT COUNT(*) as count FROM ${table};`, { type: QueryTypes.SELECT });
                console.log(`${table}: ${results[0].count}`);
            } catch (e) {
                console.log(`${table}: Table not found or error.`);
            }
        }

        // Reporting counts
        console.log('\n--- REPORTING SESSION COUNTS ---');
        try {
            const results = await sequelize.query(`SELECT module_type, COUNT(*) as count FROM reporting_sessions GROUP BY module_type;`, { type: QueryTypes.SELECT });
            results.forEach(r => console.log(`${r.module_type}: ${r.count}`));
        } catch (e) {
            console.log('reporting_sessions: Table not found or error.');
        }

        // Question counts for validation
        console.log('\n--- QUESTION COUNTS (Validation) ---');
        try {
            const results = await sequelize.query(`SELECT COUNT(*) as caiCount FROM CaiQuestions WHERE is_active = 1;`, { type: QueryTypes.SELECT });
            console.log(`CaiQuestions (Active): ${results[0].caiCount}`);
        } catch (e) { }

        try {
            const results = await sequelize.query(`SELECT COUNT(*) as pitCount FROM questions WHERE category = 'Undergear' AND is_active = 1;`, { type: QueryTypes.SELECT });
            console.log(`PitLine Questions (Undergear): ${results[0].pitCount}`);
        } catch (e) { }

        process.exit(0);
    } catch (err) {
        console.error('Debug failed:', err);
        process.exit(1);
    }
}

debugData();
