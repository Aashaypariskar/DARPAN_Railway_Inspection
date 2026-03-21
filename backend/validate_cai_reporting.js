const fs = require('fs');
const path = require('path');

// FORCE MySQL
process.env.USE_SQLITE = 'false';
process.env.DB_HOST = '3.110.16.111';
process.env.DB_NAME = 'inspection_db';
process.env.DB_USER = 'railway_user';
process.env.DB_PASS = 'Railway@123';
process.env.DB_PORT = '3307';

const sequelize = require('./config/db');
const { QueryTypes } = require('sequelize');

async function validateCAI() {
    try {
        await sequelize.authenticate();
        console.log('Connected to MySQL.');

        const results = await sequelize.query(`
            SELECT module_type, source_session_id, user_id, status
            FROM reporting_sessions 
            WHERE module_type = 'CAI';
        `, { type: QueryTypes.SELECT });

        console.log(`Found ${results.length} CAI sessions in reporting_sessions.`);
        results.forEach(r => console.log(`ID: ${r.source_session_id} | UserID: ${r.user_id} | Status: ${r.status}`));

        process.exit(0);
    } catch (err) {
        console.error('Validation failed:', err);
        process.exit(1);
    }
}

validateCAI();
