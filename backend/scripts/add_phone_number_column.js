const sequelize = require('../config/db');

async function migrate() {
    try {
        console.log('--- ADDING phone_number COLUMN ---');
        await sequelize.query("ALTER TABLE users ADD COLUMN phone_number VARCHAR(255) DEFAULT NULL;");
        console.log('--- SUCCESS ---');
        process.exit(0);
    } catch (err) {
        if (err.message.includes('Duplicate column name')) {
            console.log('--- Column already exists, skipping ---');
            process.exit(0);
        }
        console.error('--- ERROR ---', err);
        process.exit(1);
    }
}

migrate();
