const sequelize = require('../config/db');
const { QueryTypes } = require('sequelize');

async function migrateData() {
    try {
        console.log('[MIGRATION] Starting PITLINE metadata fix...');

        // 1. Identify PITLINE sessions and their answers
        // We know they are PITLINE because they are in inspection_answers but their session_id exists in pitline_sessions
        const [results] = await sequelize.query(`
            UPDATE inspection_answers ia
            JOIN pitline_sessions ps ON ia.session_id = ps.id
            SET ia.module_type = 'PITLINE'
            WHERE ia.module_type IS NULL OR ia.module_type = 'WSP'
        `);
        console.log(`[MIGRATION] Updated module_type for related records.`);

        // 2. Backfill question_text_snapshot and category_name for PITLINE
        const [snapshotResults] = await sequelize.query(`
            UPDATE inspection_answers ia
            JOIN questions q ON ia.question_id = q.id
            SET ia.question_text_snapshot = q.text,
                ia.category_name = q.category
            WHERE ia.module_type = 'PITLINE' 
            AND (ia.question_text_snapshot IS NULL OR ia.question_text_snapshot = '')
        `);
        console.log(`[MIGRATION] Backfilled snapshots for PITLINE records.`);

        console.log('[MIGRATION] data fix completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('[MIGRATION ERROR] Failed to migrate data:', error.message);
        process.exit(1);
    }
}

migrateData();
