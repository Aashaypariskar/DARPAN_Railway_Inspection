
const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

async function checkOperational(sessionId) {
    try {
        const answers = await sequelize.query(
            "SELECT id, question_id, status, remarks as remark, before_photo_url FROM cai_answers WHERE session_id = :sessionId",
            { replacements: { sessionId }, type: QueryTypes.SELECT }
        );

        console.log(`Found ${answers.length} operational answers for session ${sessionId}:`);
        answers.forEach(a => {
            if (a.status === 'DEFICIENCY') {
                console.log(`- ID: ${a.id}, Q: ${a.question_id}`);
                console.log(`  Before Photo (operational): ${a.before_photo_url || 'N/A'}`);
                console.log(`  Remark: ${a.remark}`);
            }
        });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkOperational(process.argv[2] || '6');
