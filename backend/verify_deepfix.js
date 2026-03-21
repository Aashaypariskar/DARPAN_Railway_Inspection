const sequelize = require('./config/db');
const { QueryTypes } = require('sequelize');
const ReportingProjectionService = require('./services/ReportingProjectionService');

async function verify() {
    try {
        console.log('--- Phase 25 Verification ---');

        // 1. Manually trigger projection for problematic sessions
        console.log('Projecting CAI session 4...');
        await ReportingProjectionService.projectSession(4, 'CAI');

        console.log('Projecting SICKLINE session 14...');
        await ReportingProjectionService.projectSession(14, 'SICKLINE');

        // 2. Check the results in reporting_sessions
        const results = await sequelize.query(`
            SELECT source_session_id, module_type, inspection_datetime, status 
            FROM reporting_sessions 
            WHERE (source_session_id = 4 AND module_type = 'CAI')
               OR (source_session_id = 14 AND module_type = 'SICKLINE')
        `, { type: QueryTypes.SELECT });

        console.log('--- Reporting Table Results ---');
        console.log(JSON.stringify(results, null, 2));

        // 3. Check for any other missing sessions
        const missing = await sequelize.query(`
            SELECT s.id, 'SICKLINE' as module 
            FROM sickline_sessions s 
            LEFT JOIN reporting_sessions r ON r.source_session_id = s.id AND r.module_type = 'SICKLINE' 
            WHERE r.source_session_id IS NULL
        `, { type: QueryTypes.SELECT });

        if (missing.length > 0) {
            console.log(`Found ${missing.length} more missing sickline sessions. Projecting...`);
            for (const m of missing) {
                await ReportingProjectionService.projectSession(m.id, 'SICKLINE');
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}

verify();
