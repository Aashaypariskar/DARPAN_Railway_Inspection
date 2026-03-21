const { Coach, Category, Train, sequelize } = require('../models');
const { Op } = require('sequelize');

async function migrate() {
    console.log('--- STARTING COACH MODULE TYPE MIGRATION ---');
    const transaction = await sequelize.transaction();

    try {
        // 1. Add column if it doesn't exist
        console.log('Ensuring column module_type exists...');
        const [columns] = await sequelize.query("SHOW COLUMNS FROM coaches LIKE 'module_type'");
        if (columns.length === 0) {
            await sequelize.query(`
                ALTER TABLE coaches 
                ADD COLUMN module_type ENUM('PITLINE', 'COMMISSIONARY', 'SICKLINE', 'WSP', 'CAI') 
                AFTER coach_type
            `, { transaction });
            console.log('Column added.');
        } else {
            console.log('Column already exists.');
        }

        // 2. Clear old NULL values to start fresh if needed, or just proceed to specific updates

        // 3. Backfill SICKLINE
        console.log('Backfilling SICKLINE coaches...');
        await sequelize.query(`
            UPDATE coaches c
            JOIN categories cat ON c.id = cat.coach_id
            SET c.module_type = 'SICKLINE'
            WHERE cat.name = 'Sick Line Examination'
        `, { transaction });

        // 4. Backfill COMMISSIONARY
        console.log('Backfilling COMMISSIONARY coaches...');
        await sequelize.query(`
            UPDATE coaches c
            JOIN categories cat ON c.id = cat.coach_id
            SET c.module_type = 'COMMISSIONARY'
            WHERE cat.name = 'Coach Commissionary'
        `, { transaction });

        // 5. Backfill WSP
        console.log('Backfilling WSP coaches...');
        await sequelize.query(`
            UPDATE coaches c
            JOIN categories cat ON c.id = cat.coach_id
            SET c.module_type = 'WSP'
            WHERE cat.name = 'WSP Examination'
        `, { transaction });

        // 6. Backfill PITLINE (Those with a train_id)
        console.log('Backfilling PITLINE coaches...');
        await sequelize.query(`
            UPDATE coaches 
            SET module_type = 'PITLINE'
            WHERE train_id IS NOT NULL AND (module_type IS NULL)
        `, { transaction });

        // 7. Cleanup remaining NULLs (Default to CAI or PITLINE depending on context, using CAI for safety)
        console.log('Cleaning up remaining NULL module types...');
        await sequelize.query(`
            UPDATE coaches 
            SET module_type = 'PITLINE'
            WHERE module_type IS NULL
        `, { transaction });

        await transaction.commit();
        console.log('--- MIGRATION COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (err) {
        await transaction.rollback();
        console.error('--- MIGRATION FAILED ---');
        console.error(err);
        process.exit(1);
    }
}

migrate();
