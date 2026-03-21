
const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

async function findPhotos() {
    try {
        const results = await sequelize.query(
            "SELECT reporting_session_id, before_photo_url FROM reporting_answers WHERE before_photo_url IS NOT NULL LIMIT 5",
            { type: QueryTypes.SELECT }
        );
        console.log('Sample records with photos:', results);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

findPhotos();
