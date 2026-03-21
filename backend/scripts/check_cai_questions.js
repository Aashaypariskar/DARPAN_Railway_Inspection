const sequelize = require('../config/db');
const { CaiQuestion } = require('../models');

async function check() {
    try {
        const [results] = await sequelize.query("SELECT id, question_text FROM cai_questions");
        console.log("CAI QUESTIONS:");
        console.table(results);
    } catch (e) {
        console.error("error", e.message);
    }
    process.exit();
}
check();
