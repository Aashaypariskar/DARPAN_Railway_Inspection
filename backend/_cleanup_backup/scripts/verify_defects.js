const sequelize = require('./config/db');
const { QueryTypes } = require('sequelize');

async function run() {
    try {
        console.log('--- DB DEFECT VERIFICATION ---');

        // 1. Check table structures/column existence
        const [tables] = await sequelize.query("SHOW TABLES;");
        console.log('Tables:', tables.map(t => Object.values(t)[0]));

        const tablesToCheck = ['inspection_answers', 'commissionary_answers', 'sickline_answers'];

        for (const table of tablesToCheck) {
            console.log(`\nChecking ${table}:`);

            // Check for 'answer' vs 'status' column
            const [columns] = await sequelize.query(`DESCRIBE ${table}`);
            const colNames = columns.map(c => c.Field);
            console.log('Columns:', colNames.join(', '));

            const defCol = colNames.includes('answer') ? 'answer' : (colNames.includes('status') ? 'status' : null);

            if (!defCol) {
                console.log(`[!] No deficiency column found in ${table}`);
                continue;
            }

            // Step 1: Verify defect exists
            const defects = await sequelize.query(
                `SELECT id, ${defCol} as val, resolved FROM ${table} WHERE ${defCol}='DEFICIENCY'`,
                { type: QueryTypes.SELECT }
            );
            console.log(`Step 1: Rows with DEFICIENCY in ${table}: ${defects.length}`);
            if (defects.length > 0) console.log('Sample:', defects.slice(0, 3));

            // Step 2: Verify defect not resolved
            const pending = await sequelize.query(
                `SELECT id FROM ${table} WHERE ${defCol}='DEFICIENCY' AND (resolved IS NULL OR resolved=0)`,
                { type: QueryTypes.SELECT }
            );
            console.log(`Step 2: Pending defects in ${table}: ${pending.length}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error during verification:', err);
        process.exit(1);
    }
}

run();
