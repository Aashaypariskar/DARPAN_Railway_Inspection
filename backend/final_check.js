const sequelize = require('./config/db');
const { QueryTypes } = require('sequelize');

async function check() {
    try {
        const results = await sequelize.query(`
            SELECT source_session_id, module_type, inspection_datetime, status 
            FROM reporting_sessions 
            WHERE (source_session_id = 4 AND module_type = 'CAI')
               OR (source_session_id = 14 AND module_type = 'SICKLINE')
        `, { type: QueryTypes.SELECT });

        console.log('--- Final Check Results ---');
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
