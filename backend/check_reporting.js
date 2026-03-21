const { sequelize } = require('./models');

async function check() {
    try {
        console.log('--- CHECKING REPORTING DATA ---');
        
        // Find session 25 (likely SES-25)
        const sessions = await sequelize.query(
            "SELECT * FROM reporting_sessions WHERE id = 25 OR source_session_id = 25 OR (id > 2500 AND module_type = 'AMENITY') ORDER BY id DESC LIMIT 5",
            { type: sequelize.QueryTypes.SELECT }
        );
        console.log('RELEVANT SESSIONS:', JSON.stringify(sessions, null, 2));

        if (sessions.length > 0) {
            for (const session of sessions) {
                const [count] = await sequelize.query(
                    "SELECT count(*) as count FROM reporting_answers WHERE reporting_session_id = :rid",
                    { replacements: { rid: session.id }, type: sequelize.QueryTypes.SELECT }
                );
                console.log(`SESSION ID ${session.id} (${session.session_tag}): ${count.count} answers`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
}

check();
