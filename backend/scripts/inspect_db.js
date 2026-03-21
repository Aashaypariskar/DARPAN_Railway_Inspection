const sequelize = require('../config/db');

async function inspect() {
    try {
        const [cols] = await sequelize.query("SHOW COLUMNS FROM commissionary_answers");
        console.log('COLUMNS:', JSON.stringify(cols, null, 2));
        
        const [indexes] = await sequelize.query("SHOW INDEX FROM commissionary_answers");
        console.log('INDEXES:', JSON.stringify(indexes, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error('INSPECT FAILED', err);
        process.exit(1);
    }
}

inspect();
