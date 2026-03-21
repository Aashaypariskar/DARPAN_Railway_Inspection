
const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

async function checkSession(id) {
    try {
        const [idRecord] = await sequelize.query(
            "SELECT id, source_session_id, module_type FROM reporting_sessions WHERE id = :id",
            { replacements: { id }, type: QueryTypes.SELECT }
        );
        console.log(`By ID=${id}:`, idRecord || 'NOT FOUND');

        const [sourceRecord] = await sequelize.query(
            "SELECT id, source_session_id, module_type FROM reporting_sessions WHERE source_session_id = :id",
            { replacements: { id }, type: QueryTypes.SELECT }
        );
        console.log(`By source_session_id=${id}:`, sourceRecord || 'NOT FOUND');

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSession(process.argv[2] || '6');
