const sequelize = require('./config/db');

async function testFinal() {
    try {
        console.log('Testing Final Subquery Alignment...');
        const sql = `
            SELECT * FROM (
                SELECT 
                    submission_id,
                    MAX(train_number) as train_number,
                    MAX(coach_number) as coach_number,
                    MAX(user_name) as user_name,
                    MAX(category_name) as category_name,
                    MAX(subcategory_name) as subcategory_name,
                    MAX(schedule_name) as schedule_name,
                    MAX(activity_type) as severity,
                    MAX(createdAt) as createdAt,
                    MAX(user_id) as user_id,
                    MAX(coach_id) as coach_id,
                    MAX(subcategory_id) as subcategory_id,
                    MAX(status) as session_status,
                    SUM(CASE WHEN status = 'OK' THEN 1 ELSE 0 END) as yes_count,
                    SUM(CASE WHEN status = 'DEFICIENCY' THEN 1 ELSE 0 END) as no_count,
                    SUM(CASE WHEN answer_type = 'VALUE' AND observed_value IS NOT NULL AND observed_value != '' THEN 1 ELSE 0 END) as value_count,
                    ROUND((SUM(CASE WHEN status = 'OK' THEN 1 ELSE 0 END) * 100.0) / NULLIF(SUM(CASE WHEN status IN ('OK', 'DEFICIENCY') THEN 1 ELSE 0 END), 0), 1) as compliance_score
                FROM inspection_answers
                GROUP BY submission_id

                UNION ALL

                SELECT 
                    CONCAT('COMM-', s.id) as submission_id,
                    'COMMISSIONARY' as train_number,
                    s.coach_number,
                    u.name as user_name,
                    'Coach Commissionary' as category_name,
                    'Combined Matrix' as subcategory_name,
                    '' as schedule_name,
                    'Major/Minor' as severity,
                    s.createdAt,
                    s.created_by as user_id,
                    0 as coach_id,
                    0 as subcategory_id,
                    MAX(s.status) as session_status,
                    SUM(CASE WHEN a.status = 'OK' THEN 1 ELSE 0 END) as yes_count,
                    SUM(CASE WHEN a.status = 'DEFICIENCY' THEN 1 ELSE 0 END) as no_count,
                    0 as value_count,
                    ROUND((SUM(CASE WHEN a.status = 'OK' THEN 1 ELSE 0 END) * 100.0) / NULLIF(SUM(CASE WHEN a.status IN ('OK', 'DEFICIENCY') THEN 1 ELSE 0 END), 0), 1) as compliance_score
                FROM commissionary_sessions s
                LEFT JOIN commissionary_answers a ON s.id = a.session_id
                LEFT JOIN users u ON s.created_by = u.id
                WHERE s.status = 'COMPLETED'
                GROUP BY s.id
            ) as combined
            WHERE 1=1
            ORDER BY createdAt DESC
            LIMIT 1
        `;

        const results = await sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });
        console.log('Results Found:', results.length);
        if (results.length > 0) console.log('Sample Data:', results[0]);
    } catch (err) {
        console.error('QUERY FAILED:', err.message);
        if (err.parent) console.error('Parent Error:', err.parent.message);
    } finally {
        await sequelize.close();
    }
}

testFinal();
