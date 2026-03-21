const sequelize = require('../config/db');

async function refineSchema() {
    try {
        console.log('--- REFINING SCHEMA FOR AMENITY SUPPORT (MANDATORY FIXES) ---');

        // 1. Convert reporting_sessions.module_type to VARCHAR(20)
        console.log('1. Converting reporting_sessions.module_type to VARCHAR(20)...');
        await sequelize.query(`
            ALTER TABLE reporting_sessions 
            MODIFY COLUMN module_type VARCHAR(20) NOT NULL;
        `);

        // 2. Add index to commissionary_sessions(module_type)
        console.log('2. Adding index to commissionary_sessions(module_type)...');
        // Check if index exists first
        const [indexes] = await sequelize.query("SHOW INDEX FROM commissionary_sessions WHERE Key_name = 'idx_module_type'");
        if (indexes.length === 0) {
            await sequelize.query(`
                CREATE INDEX idx_module_type ON commissionary_sessions(module_type);
            `);
        } else {
            console.log('   - Index idx_module_type already exists');
        }

        console.log('--- SCHEMA REFINEMENT COMPLETED ---');
        process.exit(0);
    } catch (err) {
        console.error('--- REFINEMENT FAILED ---', err);
        process.exit(1);
    }
}

refineSchema();
