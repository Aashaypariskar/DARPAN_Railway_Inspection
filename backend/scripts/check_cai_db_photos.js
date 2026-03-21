const sequelize = require('../config/db');

async function check() {
    try {
        const [results] = await sequelize.query(`
            SELECT id, session_id, question_id, before_photo_url, after_photo_url 
            FROM cai_answers 
            ORDER BY id DESC LIMIT 5
        `);
        console.log(JSON.stringify(results, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
check();
