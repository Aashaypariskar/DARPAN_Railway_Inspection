
const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

async function checkOperational(sessionId) {
    try {
        const answers = await sequelize.query(
            "SELECT id, question_id, status, remarks as remark, photo_url, image_path, after_photo_url FROM inspection_answers WHERE session_id = :sessionId AND module_type = 'PITLINE'",
            { replacements: { sessionId }, type: QueryTypes.SELECT }
        );

        console.log(`Found ${answers.length} operational answers for session ${sessionId}:`);
        answers.forEach(a => {
            if (a.status === 'DEFICIENCY') {
                console.log(`- ID: ${a.id}, Q: ${a.question_id}`);
                console.log(`  Photo URL: ${a.photo_url || 'N/A'}`);
                console.log(`  Image Path: ${a.image_path || 'N/A'}`);
                console.log(`  After Photo URL: ${a.after_photo_url || 'N/A'}`);
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
