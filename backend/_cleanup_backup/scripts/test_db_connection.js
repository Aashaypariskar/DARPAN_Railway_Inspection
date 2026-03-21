const sequelize = require('./config/db');

async function testConnection() {
    try {
        console.log('Attempting to connect to the database...');
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

testConnection();
