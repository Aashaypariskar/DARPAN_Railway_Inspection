const sequelize = require('../config/db');

async function fixAnswers() {
    try {
        console.log('--- REFINING CommissionaryAnswer SCHEMA ---');

        // 1. Add module_type to commissionary_answers
        console.log('1. Adding module_type to commissionary_answers...');
        const [cols] = await sequelize.query("SHOW COLUMNS FROM commissionary_answers LIKE 'module_type'");
        if (cols.length === 0) {
            await sequelize.query(`
                ALTER TABLE commissionary_answers ADD COLUMN module_type 
                ENUM('COMMISSIONARY', 'AMENITY') NOT NULL DEFAULT 'COMMISSIONARY' 
                AFTER resolved_at;
            `);
            
            // Update existing data based on session_id if possible, 
            // but for now default 'COMMISSIONARY' is safe as Amenity is new.
            console.log('   - Column added.');
        } else {
            console.log('   - module_type already exists in commissionary_answers');
        }

        // 2. Update unique index
        console.log('2. Updating unique index idx_comm_ans_comp...');
        try {
            await sequelize.query("ALTER TABLE commissionary_answers DROP INDEX idx_comm_ans_comp");
        } catch (e) {
            console.log('   - Index did not exist or could not be dropped');
        }
        
        await sequelize.query(`
            CREATE UNIQUE INDEX idx_comm_ans_comp 
            ON commissionary_answers (session_id, question_id, coach_id, compartment_id, subcategory_id, activity_type, module_type);
        `);

        console.log('--- SCHEMA FIX COMPLETED ---');
        process.exit(0);
    } catch (err) {
        console.error('--- FIX FAILED ---', err);
        process.exit(1);
    }
}

fixAnswers();
