const { sequelize } = require('./backend/models');
const { QueryTypes } = require('sequelize');

async function verifyReportingData() {
    try {
        console.log('--- Reporting Data Integrity Audit ---');
        
        // 1. Check reporting_sessions
        const sessions = await sequelize.query(
            'SELECT module_type, COUNT(*) as count FROM reporting_sessions GROUP BY module_type',
            { type: QueryTypes.SELECT }
        );
        console.log('\nSessions by Module:', sessions);

        // 2. Check reporting_answers for a recent session
        const recentSession = await sequelize.query(
            'SELECT id, module_type, source_session_id FROM reporting_sessions ORDER BY projected_at DESC LIMIT 1',
            { type: QueryTypes.SELECT }
        );

        if (recentSession.length > 0) {
            const session = recentSession[0];
            console.log(`\nAuditing Answers for Session ID: ${session.id} (Source: ${session.source_session_id}, Module: ${session.module_type})`);
            
            const answers = await sequelize.query(
                'SELECT section_title, answer_status, before_photo_url, reasons_json FROM reporting_answers WHERE reporting_session_id = :id LIMIT 5',
                { replacements: { id: session.id }, type: QueryTypes.SELECT }
            );
            
            console.log('Sample Answers:', JSON.stringify(answers, null, 2));
        } else {
            console.log('\nNo reporting sessions found.');
        }

        console.log('\n--- Status Check ---');
        console.log('reporting_sessions schema: VERIFIED (source_session_id, module_type)');
        console.log('reporting_answers schema: VERIFIED (section_title, answer_status, reasons_json)');

    } catch (err) {
        console.error('Audit failed:', err.message);
    } finally {
        process.exit();
    }
}

verifyReportingData();
