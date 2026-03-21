const sequelize = require('./config/db');
const { QueryTypes } = require('sequelize');

async function check() {
    try {
        const results = await sequelize.query(`
            SELECT id, createdAt, updatedAt 
            FROM cai_sessions 
            WHERE id = 4
        `, { type: QueryTypes.SELECT });

        console.log('--- CAI Session Details ---');
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
