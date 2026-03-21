const sequelize = require('../config/db');

async function dropConstraints() {
    try {
        console.log('[CLEANUP] Connecting to database...');

        // 1. Identify existing constraints
        const [results] = await sequelize.query("SHOW CREATE TABLE inspection_answers");
        const createTableSql = results[0]['Create Table'];
        console.log('[DEBUG] Current Table Schema identified.');

        // 2. Identify the specific FK constraints for train_id and coach_id
        // These typically look like: CONSTRAINT `inspection_answers_ibfk_XXX` FOREIGN KEY (`train_id`) ...
        const fkMatches = createTableSql.match(/CONSTRAINT `([^`]+)` FOREIGN KEY \(`(train_id|coach_id)`\)/g);

        if (!fkMatches || fkMatches.length === 0) {
            console.log('[CLEANUP] No train_id or coach_id foreign keys found. Table is already clean.');
            process.exit(0);
        }

        console.log(`[CLEANUP] Found ${fkMatches.length} candidate constraints for removal.`);

        for (const match of fkMatches) {
            // Extract the constraint name
            const nameMatch = match.match(/CONSTRAINT `([^`]+)`/);
            if (nameMatch && nameMatch[1]) {
                const constraintName = nameMatch[1];
                console.log(`[CLEANUP] Dropping constraint: ${constraintName}...`);
                await sequelize.query(`ALTER TABLE inspection_answers DROP FOREIGN KEY ${constraintName}`);
                console.log(`[CLEANUP] Successfully dropped ${constraintName}.`);
            }
        }

        console.log('[CLEANUP] All polymorphic ID constraints have been removed.');
        process.exit(0);
    } catch (error) {
        console.error('[CLEANUP ERROR] Failed to drop constraints:', error.message);
        process.exit(1);
    }
}

dropConstraints();
