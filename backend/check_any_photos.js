
const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

async function checkPhotos(sessionId) {
    try {
        const answers = await sequelize.query(
            "SELECT id, question_id, status, photo_url, image_path FROM inspection_answers WHERE session_id = :sessionId AND (photo_url IS NOT NULL OR image_path IS NOT NULL) LIMIT 10",
            { replacements: { sessionId }, type: QueryTypes.SELECT }
        );

        console.log(`Found ${answers.length} answers with photos for session ${sessionId}:`);
        answers.forEach(a => {
            console.log(`- ID: ${a.id}, Status: ${a.status}, Q: ${a.question_id}`);
            console.log(`  Photo URL: ${a.photo_url || 'N/A'}`);
            console.log(`  Image Path: ${a.image_path || 'N/A'}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkPhotos(process.argv[2] || '6');
