const sequelize = require('./config/db');
const { QueryTypes } = require('sequelize');
const ReportingProjectionService = require('./services/ReportingProjectionService');

async function finalVerify() {
    try {
        console.log('--- Final Date Update Verification ---');

        // 1. Force updatedAt for CAI session 4 to March 5
        console.log('Bumping CAI session 4 updatedAt to March 5...');
        await sequelize.query(`
            UPDATE cai_sessions 
            SET updatedAt = '2026-03-05 09:00:00' 
            WHERE id = 4
        `, { type: QueryTypes.UPDATE });

        // 2. Re-project
        console.log('Re-projecting CAI session 4...');
        await ReportingProjectionService.projectSession(4, 'CAI');

        // 3. Verify in reporting_sessions
        const results = await sequelize.query(`
            SELECT source_session_id, module_type, inspection_datetime, status 
            FROM reporting_sessions 
            WHERE source_session_id = 4 AND module_type = 'CAI'
        `, { type: QueryTypes.SELECT });

        console.log('--- Reporting Table Result ---');
        console.log(JSON.stringify(results, null, 2));

        if (results[0].inspection_datetime.includes('2026-03-05')) {
            console.log('SUCCESS: inspection_datetime correctly updated to March 5!');
        } else {
            console.log('FAILURE: inspection_datetime is still ' + results[0].inspection_datetime);
        }

        process.exit(0);
    } catch (err) {
        console.error('Final verification FATAL ERROR:');
        console.error(err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

finalVerify();
