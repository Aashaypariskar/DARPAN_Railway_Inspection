const sequelize = require('../config/db');

async function migrate() {
    try {
        console.log('--- STARTING DATABASE MIGRATION ---');

        // 1. Add defect_locked to Answer tables
        const answerTables = ['inspection_answers', 'commissionary_answers', 'sickline_answers', 'cai_answers'];
        for (const table of answerTables) {
            console.log(`Adding columns to ${table}...`);
            try {
                await sequelize.query(`ALTER TABLE ${table} ADD COLUMN defect_locked TINYINT(1) DEFAULT 0`);
            } catch (e) { console.log(`  defect_locked already exists in ${table} or error: ${e.message}`); }
            
            try {
                await sequelize.query(`ALTER TABLE ${table} ADD COLUMN resolved TINYINT(1) DEFAULT 0`);
            } catch (e) { console.log(`  resolved already exists in ${table} or error: ${e.message}`); }
        }

        // 2. Add submitted_at and closed_at to Session tables
        const sessionTables = ['commissionary_sessions', 'sickline_sessions', 'wsp_sessions', 'cai_sessions', 'pitline_sessions'];
        for (const table of sessionTables) {
            console.log(`Adding columns to ${table}...`);
            try {
                await sequelize.query(`ALTER TABLE ${table} ADD COLUMN submitted_at DATETIME NULL`);
            } catch (e) { console.log(`  submitted_at already exists in ${table} or error: ${e.message}`); }

            try {
                await sequelize.query(`ALTER TABLE ${table} ADD COLUMN closed_at DATETIME NULL`);
            } catch (e) { console.log(`  closed_at already exists in ${table} or error: ${e.message}`); }
        }

        // 3. Update Status ENUMs for Sessions
        // Note: For MySQL, we need to redefine the ENUM by altering the column.
        // We'll standardize to 'IN_PROGRESS', 'SUBMITTED', 'CLOSED'
        // Some tables use 'DRAFT' as initial state, we'll keep that or transition to 'IN_PROGRESS' if needed.
        // The user says "IN_PROGRESS -> SUBMITTED -> CLOSED".
        
        for (const table of sessionTables) {
            console.log(`Updating status ENUM for ${table}...`);
            // We include DRAFT and COMPLETED for backward compatibility if they exist, but add CLOSED
            await sequelize.query(`ALTER TABLE ${table} MODIFY COLUMN status ENUM('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CLOSED') DEFAULT 'IN_PROGRESS'`);
        }

        console.log('--- MIGRATION COMPLETE ---');
        process.exit(0);
    } catch (error) {
        console.error('MIGRATION FAILED:', error);
        process.exit(1);
    }
}

migrate();
