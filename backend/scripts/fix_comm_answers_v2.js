const sequelize = require('../config/db');

async function fixAnswers() {
    try {
        console.log('--- FORCED CommissionaryAnswer SCHEMA REPAIR ---');

        // 1. Add module_type column
        console.log('Act 1: Adding module_type...');
        try {
            await sequelize.query(`
                ALTER TABLE commissionary_answers 
                ADD COLUMN module_type ENUM('COMMISSIONARY', 'AMENITY') NOT NULL DEFAULT 'COMMISSIONARY' 
                AFTER resolved_at
            `);
            console.log('   - Column added successfully.');
        } catch (e) {
            if (e.message.includes('Duplicate column name')) {
                console.log('   - Column already exists.');
            } else {
                console.error('   - Failed to add column:', e.message);
            }
        }

        // 2. Drop existing index if it exists (by any name that might clash)
        console.log('Act 2: Dropping old index...');
        try {
            await sequelize.query("ALTER TABLE commissionary_answers DROP INDEX idx_comm_ans_comp");
            console.log('   - Old index dropped.');
        } catch (e) {
            console.log('   - Index drop skipped (likely doesn\'t exist):', e.message);
        }

        // 3. Create new unique index
        console.log('Act 3: Creating multi-column unique index...');
        await sequelize.query(`
            CREATE UNIQUE INDEX idx_comm_ans_comp 
            ON commissionary_answers (session_id, question_id, coach_id, compartment_id, subcategory_id, activity_type, module_type)
        `);
        console.log('   - New index created.');

        console.log('--- REPAIR COMPLETED ---');
        process.exit(0);
    } catch (err) {
        console.error('--- REPAIR CRITICALLY FAILED ---', err);
        process.exit(1);
    }
}

fixAnswers();
