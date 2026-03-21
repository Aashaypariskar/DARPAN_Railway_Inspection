const { sequelize } = require('./models');

async function debugSession(sourceId) {
    try {
        const [session] = await sequelize.query(
            'SELECT * FROM reporting_sessions WHERE source_session_id = ? AND module_type = "PITLINE"',
            { replacements: [sourceId], type: sequelize.QueryTypes.SELECT }
        );

        if (!session) {
            console.log(`[DEBUG] No PITLINE reporting session found for source_session_id: ${sourceId}`);
            // Check all modules
            const allSessions = await sequelize.query(
                'SELECT * FROM reporting_sessions WHERE source_session_id = ?',
                { replacements: [sourceId], type: sequelize.QueryTypes.SELECT }
            );
            console.log(`[DEBUG] Other modules with source_session_id ${sourceId}:`, allSessions.map(s => s.module_type));
            return;
        }

        console.log('[DEBUG] Found Reporting Session:', JSON.stringify(session, null, 2));

        const user = await sequelize.query(
            'SELECT * FROM users WHERE id = ?',
            { replacements: [session.user_id], type: sequelize.QueryTypes.SELECT }
        );
        console.log('[DEBUG] Associated User:', user.length > 0 ? JSON.stringify(user[0], null, 2) : 'NOT FOUND');

        const answers = await sequelize.query(
            'SELECT COUNT(*) as count FROM reporting_answers WHERE reporting_session_id = ?',
            { replacements: [session.id], type: sequelize.QueryTypes.SELECT }
        );
        console.log(`[DEBUG] Answer count for reporting session ${session.id}:`, answers[0].count);

    } catch (err) {
        console.error('[DEBUG ERROR]', err);
    } finally {
        await sequelize.close();
    }
}

const sid = process.argv[2] || 6;
debugSession(sid);
