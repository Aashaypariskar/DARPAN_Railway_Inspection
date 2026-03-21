
const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

async function checkDefects(sourceSessionId) {
    try {
        // 1. Find reporting_session_id
        const session = await sequelize.query(
            "SELECT id, module_type FROM reporting_sessions WHERE source_session_id = :sourceSessionId",
            { replacements: { sourceSessionId }, type: QueryTypes.SELECT }
        );

        if (session.length === 0) {
            console.log(`Session ${sourceSessionId} not found in reporting_sessions`);
            return;
        }

        const reportingId = session[0].id;
        console.log(`Reporting ID for ${sourceSessionId}: ${reportingId}`);

        // 2. Query reporting_answers for defects
        const defects = await sequelize.query(
            "SELECT id, question_text, answer_status, remark, before_photo_url, after_photo_url FROM reporting_answers WHERE reporting_session_id = :reportingId AND answer_status = 'DEFICIENCY'",
            { replacements: { reportingId }, type: QueryTypes.SELECT }
        );

        console.log(`Found ${defects.length} defects:`);
        defects.forEach(d => {
            console.log(`- ID: ${d.id}`);
            console.log(`  Question: ${d.question_text.substring(0, 50)}...`);
            console.log(`  Before: ${d.before_photo_url || 'NULL'}`);
            console.log(`  After: ${d.after_photo_url || 'NULL'}`);
            console.log(`  Remark: ${d.remark}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

const sessionId = process.argv[2] || '6';
checkDefects(sessionId);
