const { sequelize } = require('./models');
const queryService = require('./services/MonitoringQueryService');

async function validate() {
    try {
        console.log('--- STARTING PERFORMANCE VALIDATION ---');

        // 1. Session Query Explain
        const sessionSQL = `
            SELECT * FROM (
                (SELECT id AS session_id, 'WSP' AS module_type, coach_id, NULL AS train_id, created_by AS inspector_id, CAST(COALESCE(inspection_date, createdAt) AS DATETIME) AS created_at, status FROM wsp_sessions ORDER BY createdAt DESC LIMIT 70)
                UNION ALL
                (SELECT id, 'SICKLINE', coach_id, NULL, created_by, CAST(COALESCE(inspection_date, createdAt) AS DATETIME), status FROM sickline_sessions ORDER BY createdAt DESC LIMIT 70)
                UNION ALL
                (SELECT id, 'CAI', coach_id, NULL, inspector_id, createdAt, status FROM cai_sessions ORDER BY createdAt DESC LIMIT 70)
                UNION ALL
                (SELECT id, 'PITLINE', coach_id, train_id, inspector_id, createdAt, status FROM pitline_sessions ORDER BY createdAt DESC LIMIT 70)
            ) AS unified_sessions
            ORDER BY created_at DESC
            LIMIT 20 OFFSET 0
        `;
        const sessionExplain = await sequelize.query('EXPLAIN ' + sessionSQL);
        console.log('\n--- SESSION QUERY EXPLAIN ---');
        console.table(sessionExplain[0]);

        // 2. Defect Query Explain
        const defectSQL = `
            SELECT * FROM (
                (SELECT id AS answer_id, session_id, 'PITLINE' as module_type, createdAt AS created_at, status, resolved, 
                       (photo_url IS NOT NULL) AS has_before_photo, 
                       (after_photo_url IS NOT NULL) AS has_after_photo 
                FROM inspection_answers WHERE status = 'DEFICIENCY' ORDER BY createdAt DESC LIMIT 70)
                UNION ALL
                (SELECT id, session_id, 'SICKLINE', createdAt, status, resolved, 
                       (photo_url IS NOT NULL), 
                       (after_photo_url IS NOT NULL) 
                FROM sickline_answers WHERE status = 'DEFICIENCY' ORDER BY createdAt DESC LIMIT 70)
            ) AS unified_defects
            ORDER BY created_at DESC
            LIMIT 20 OFFSET 0
        `;
        const defectExplain = await sequelize.query('EXPLAIN ' + defectSQL);
        console.log('\n--- DEFECT QUERY EXPLAIN ---');
        console.table(defectExplain[0]);

        // 3. Summary Stats Explain
        const summarySQL = `
            SELECT
                ((SELECT COUNT(*) FROM wsp_sessions WHERE DATE(createdAt) = '2026-02-28') +
                 (SELECT COUNT(*) FROM pitline_sessions WHERE DATE(createdAt) = '2026-02-28')) AS total_today
        `;
        const summaryExplain = await sequelize.query('EXPLAIN ' + summarySQL);
        console.log('\n--- SUMMARY QUERY EXPLAIN ---');
        console.table(summaryExplain[0]);

    } catch (err) {
        console.error('VALIDATION FAILED:', err.message);
    } finally {
        process.exit();
    }
}

validate();
