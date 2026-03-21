const sequelize = require('./config/db');

async function testQuery() {
    try {
        console.log('Testing DB connection...');
        await sequelize.authenticate();
        console.log('DB connected.');

        console.log('Testing Report Query...');
        const sql = `
            SELECT * FROM (
                SELECT 
                    submission_id,
                    MAX(train_number) as train_number,
                    MAX(status) as status
                FROM inspection_answers
                GROUP BY submission_id

                UNION ALL

                SELECT 
                    CONCAT('COMM-', s.id) as submission_id,
                    'COMMISSIONARY' as train_number,
                    MAX(s.status) as status
                FROM commissionary_sessions s
                LEFT JOIN commissionary_answers a ON s.id = a.session_id
                GROUP BY s.id
            ) as combined
            WHERE 1=1
            LIMIT 1
        `;

        const results = await sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });
        console.log('Query success:', results);
    } catch (err) {
        console.error('QUERY FAILED:', err.message);
        if (err.parent) console.error('Parent Error:', err.parent.message);
        if (err.sql) console.log('SQL:', err.sql);
    } finally {
        await sequelize.close();
    }
}

testQuery();
