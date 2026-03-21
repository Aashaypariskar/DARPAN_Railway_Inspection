
const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

async function findDefectPhotos() {
    try {
        const results = await sequelize.query(
            "SELECT reporting_session_id, question_text, before_photo_url FROM reporting_answers WHERE answer_status = 'DEFICIENCY' AND before_photo_url IS NOT NULL LIMIT 5",
            { type: QueryTypes.SELECT }
        );
        console.log('Deficiencies with photos:', results);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

findDefectPhotos();
