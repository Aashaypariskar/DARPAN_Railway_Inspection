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

async function checkTables() {
    try {
        await sequelize.authenticate();
        const dialect = sequelize.getDialect();
        console.log('Dialect:', dialect);

        let tables;
        if (dialect === 'sqlite') {
            tables = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table';", { type: QueryTypes.SELECT });
            tables = tables.map(t => t.name);
        } else {
            const results = await sequelize.query("SHOW TABLES;", { type: QueryTypes.SELECT });
            tables = results.map(r => Object.values(r)[0]);
        }
        console.log('Available Tables:', tables.join(', '));

        const requiredTables = ['reporting_sessions', 'reporting_answers', 'CaiSessions', 'inspection_sessions'];
        for (const t of requiredTables) {
            console.log(`Checking table ${t}: ${tables.includes(t) ? 'EXISTS' : 'MISSING'}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
}

checkTables();
