const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

async function findColumn(colName) {
    try {
        console.log(`Searching for column: ${colName}`);
        const tables = await sequelize.query("SHOW TABLES", { type: QueryTypes.SELECT });
        const dbName = sequelize.config.database;
        
        for (const tableObj of tables) {
            const tableName = Object.values(tableObj)[0];
            const columns = await sequelize.query(`SHOW COLUMNS FROM ${tableName}`, { type: QueryTypes.SELECT });
            const match = columns.find(c => c.Field.toLowerCase() === colName.toLowerCase());
            if (match) {
                console.log(`FOUND in table [${tableName}]: ${match.Field} (${match.Type})`);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error('Search failed:', err);
        process.exit(1);
    }
}

findColumn('compartment_question_id');
