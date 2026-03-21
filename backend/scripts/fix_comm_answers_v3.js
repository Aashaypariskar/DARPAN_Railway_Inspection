const sequelize = require('../config/db');

async function fix() {
    try {
        console.log('--- FINAL SCHEMA ATTEMPT ---');
        
        // 1. ADD COLUMN
        try {
            await sequelize.query("ALTER TABLE commissionary_answers ADD COLUMN module_type ENUM('COMMISSIONARY', 'AMENITY') NOT NULL DEFAULT 'COMMISSIONARY' AFTER resolved_at");
            console.log('Added module_type column.');
        } catch (e) {
            console.log('Column skip:', e.message);
        }

        // 2. DROP INDEX CAREFULLY
        try {
            await sequelize.query("DROP INDEX idx_comm_ans_comp ON commissionary_answers");
            console.log('Dropped index via DROP INDEX.');
        } catch (e) {
            console.log('Drop index skip:', e.message);
        }

        // 3. CREATE NEW INDEX
        try {
            await sequelize.query("CREATE UNIQUE INDEX idx_comm_ans_comp ON commissionary_answers (session_id, question_id, coach_id, compartment_id, subcategory_id, activity_type, module_type)");
            console.log('Created new index.');
        } catch (e) {
            console.log('Create index skip:', e.message);
        }

        console.log('--- DONE ---');
        process.exit(0);
    } catch (err) {
        console.error('FAILED', err);
        process.exit(1);
    }
}

fix();
