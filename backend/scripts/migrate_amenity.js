const sequelize = require('../config/db');

async function migrate() {
    try {
        console.log('--- STARTING AMENITY SCHEMA MIGRATION ---');

        // 1. Update coaches table
        console.log('1. Updating coaches.module_type...');
        await sequelize.query(`
            ALTER TABLE coaches MODIFY COLUMN module_type 
            ENUM('PITLINE', 'COMMISSIONARY', 'SICKLINE', 'WSP', 'CAI', 'AMENITY') 
            CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);

        // 2. Update reporting_sessions table
        console.log('2. Updating reporting_sessions.module_type...');
        await sequelize.query(`
            ALTER TABLE reporting_sessions MODIFY COLUMN module_type 
            ENUM('PITLINE', 'SICKLINE', 'COMMISSIONARY', 'WSP', 'CAI', 'AMENITY') 
            NOT NULL;
        `);

        // 3. Add module_type to commissionary_sessions
        console.log('3. Adding module_type to commissionary_sessions...');
        const [cols] = await sequelize.query("SHOW COLUMNS FROM commissionary_sessions LIKE 'module_type'");
        if (cols.length === 0) {
            await sequelize.query(`
                ALTER TABLE commissionary_sessions ADD COLUMN module_type 
                ENUM('COMMISSIONARY', 'AMENITY') NOT NULL DEFAULT 'COMMISSIONARY' 
                AFTER inspector_name;
            `);
        } else {
            console.log('   - module_type already exists in commissionary_sessions');
        }

        console.log('--- MIGRATION COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (err) {
        console.error('--- MIGRATION FAILED ---', err);
        process.exit(1);
    }
}

migrate();
