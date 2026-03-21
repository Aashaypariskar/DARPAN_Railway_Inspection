const sequelize = require('../config/db');
const ReportingProjectionService = require('../services/ReportingProjectionService');
const { QueryTypes } = require('sequelize');

async function refreshAllReportingData() {
    try {
        console.log('--- STARTING HISTORICAL DATA REFRESH ---');
        
        // 1. Fetch all existing reporting sessions
        const sessions = await sequelize.query(`
            SELECT id, source_session_id, module_type 
            FROM reporting_sessions
            ORDER BY id ASC
        `, { type: QueryTypes.SELECT });

        console.log(`Found ${sessions.length} sessions to re-project.`);

        let successCount = 0;
        let failCount = 0;

        // 2. Iterate and re-project
        for (const session of sessions) {
            try {
                process.stdout.write(`Processing Session ID: ${session.id} (Source: ${session.source_session_id})... `);
                
                await ReportingProjectionService.reprojectReportingSession(
                    session.id, 
                    session.source_session_id, 
                    session.module_type
                );
                
                console.log('✅');
                successCount++;
            } catch (err) {
                console.log('❌');
                console.error(`Error processing session ${session.id}:`, err.message);
                failCount++;
            }
        }

        console.log('--- REFRESH COMPLETE ---');
        console.log(`Successfully Processed: ${successCount}`);
        console.log(`Failed: ${failCount}`);
        
        process.exit(0);
    } catch (error) {
        console.error('CRITICAL REFRESH ERROR:', error);
        process.exit(1);
    }
}

refreshAllReportingData();
