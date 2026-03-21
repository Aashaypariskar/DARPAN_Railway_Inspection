const { sequelize } = require('./models');

async function migrate() {
    try {
        console.log('Running migration: Adding question_text_snapshot to cai_answers...');
        await sequelize.query(`
            ALTER TABLE cai_answers 
            ADD COLUMN question_text_snapshot TEXT 
            AFTER resolution_remark
        `);
        console.log('SUCCESS: Migration completed.');
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('NOTICE: Column already exists.');
        } else {
            console.error('Migration FAILED:', e.message);
        }
    } finally {
        await sequelize.close();
    }
}

migrate();
