const { sequelize } = require('./models');

async function sync() {
    try {
        console.log('Starting DB sync with { alter: true }...');
        await sequelize.sync({ alter: true });
        console.log('DB sync completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('DB sync failed:', err);
        process.exit(1);
    }
}

sync();
