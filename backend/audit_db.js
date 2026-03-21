const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

async function auditSchema() {
    try {
        console.log('--- Database Schema Audit ---');
        
        const tables = ['commissionary_answers', 'inspection_answers', 'sickline_answers', 'cai_answers'];
        
        for (const table of tables) {
            console.log(`\nTable: ${table}`);
            const columns = await sequelize.query(`DESCRIBE ${table}`, { type: QueryTypes.SELECT });
            columns.forEach(col => {
                console.log(` - ${col.Field} (${col.Type})`);
            });
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Audit failed:', err);
        process.exit(1);
    }
}

auditSchema();
