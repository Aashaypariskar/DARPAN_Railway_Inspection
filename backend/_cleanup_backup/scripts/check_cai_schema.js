const { sequelize } = require('./models');

async function check() {
    try {
        console.log('Fetching columns for cai_answers...');
        const [results] = await sequelize.query("SHOW COLUMNS FROM cai_answers");
        const columnNames = results.map(r => r.Field);
        console.log('Columns found:', columnNames);
        if (columnNames.includes('question_text_snapshot')) {
            console.log('Column question_text_snapshot EXISTS.');
        } else {
            console.log('Column question_text_snapshot MISSING.');
        }
    } catch (e) {
        console.error('Check failed:', e.message);
    } finally {
        await sequelize.close();
    }
}

check();
