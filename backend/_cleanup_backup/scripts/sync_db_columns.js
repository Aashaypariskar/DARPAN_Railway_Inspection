const sequelize = require('./config/db');

async function syncSchema() {
    try {
        console.log('--- STARTING MANUAL SCHEMA SYNC (SICKLINE STABILITY) ---');

        // 1. Common session updates
        const tables = ['commissionary_sessions', 'sickline_sessions', 'wsp_sessions'];
        for (const table of tables) {
            console.log(`Checking ${table} for last_saved_at...`);
            const [results] = await sequelize.query(`SHOW COLUMNS FROM ${table} LIKE 'last_saved_at'`);
            if (results.length === 0) {
                console.log(`Adding last_saved_at to ${table}...`);
                await sequelize.query(`ALTER TABLE ${table} ADD COLUMN last_saved_at DATETIME NULL`);
            }

            console.log(`Updating status ENUM for ${table}...`);
            let defaultValue = 'DRAFT';
            if (table === 'sickline_sessions') defaultValue = 'IN_PROGRESS';
            await sequelize.query(`ALTER TABLE ${table} MODIFY COLUMN status ENUM('DRAFT', 'SUBMITTED', 'COMPLETED', 'IN_PROGRESS') DEFAULT '${defaultValue}' NOT NULL`);
        }

        // 2. Specialized SickLineAnswer updates
        console.log('Checking sickline_answers for coach_id...');
        const [coachIdCol] = await sequelize.query(`SHOW COLUMNS FROM sickline_answers LIKE 'coach_id'`);
        if (coachIdCol.length === 0) {
            console.log('Adding coach_id to sickline_answers...');
            await sequelize.query(`ALTER TABLE sickline_answers ADD COLUMN coach_id INT NULL AFTER session_id`);
        }

        console.log('Making sickline_answers columns nullable...');
        // We use raw SQL to avoid index limit/sync issues
        await sequelize.query(`ALTER TABLE sickline_answers MODIFY COLUMN compartment_id VARCHAR(255) NULL`);
        await sequelize.query(`ALTER TABLE sickline_answers MODIFY COLUMN subcategory_id INT NULL`);
        await sequelize.query(`ALTER TABLE sickline_answers MODIFY COLUMN activity_type ENUM('Major', 'Minor') NULL`);

        // 3. CAI Module Tables (Standalone creation)
        console.log('Creating CAI tables if they do not exist...');

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS cai_questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                cai_code VARCHAR(50) NOT NULL,
                question_text TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL
            ) ENGINE=InnoDB;
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS cai_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                coach_id INT NOT NULL,
                inspector_id INT NOT NULL,
                status ENUM('DRAFT', 'SUBMITTED') DEFAULT 'DRAFT' NOT NULL,
                last_saved_at DATETIME NULL,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL
            ) ENGINE=InnoDB;
        `);

        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS cai_answers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id INT NOT NULL,
                coach_id INT NOT NULL,
                question_id INT NOT NULL,
                status VARCHAR(20) NULL,
                remarks TEXT NULL,
                reason_ids JSON NULL,
                before_photo_url TEXT NULL,
                resolved BOOLEAN DEFAULT 0,
                after_photo_url TEXT NULL,
                resolution_remark TEXT NULL,
                resolved_at DATETIME NULL,
                createdAt DATETIME NOT NULL,
                updatedAt DATETIME NOT NULL
            ) ENGINE=InnoDB;
        `);

        console.log('--- MANUAL SYNC COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (err) {
        console.error('--- MANUAL SYNC FAILED ---');
        console.error(err);
        process.exit(1);
    }
}

syncSchema();
