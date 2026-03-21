const sequelize = require('../config/db');
const { QueryTypes } = require('sequelize');

async function checkPitlineDefects() {
    try {
        console.log('[DEBUG] Querying PITLINE deficiencies...');
        const results = await sequelize.query(`
            SELECT id, module_type, question_id, status, photo_url, image_path, createdAt 
            FROM inspection_answers 
            WHERE module_type = 'PITLINE' 
            AND (photo_url LIKE 'file://%' OR image_path LIKE 'file://%')
            ORDER BY createdAt DESC 
            LIMIT 10
        `, { type: QueryTypes.SELECT });

        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('[ERROR]', error.message);
        process.exit(1);
    }
}

checkPitlineDefects();
