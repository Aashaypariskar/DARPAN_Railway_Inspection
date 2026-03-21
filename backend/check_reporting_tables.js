const sequelize = require('./config/db');

async function checkTables() {
    try {
        const [results] = await sequelize.query("SHOW TABLES LIKE 'reporting_%'");
        console.log('Reporting Tables:', results);

        for (const table of results) {
            const tableName = Object.values(table)[0];
            const [count] = await sequelize.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            console.log(`Table ${tableName} count:`, count[0].count);
        }
    } catch (err) {
        console.error('Error checking tables:', err);
    } finally {
        await sequelize.close();
    }
}

checkTables();
