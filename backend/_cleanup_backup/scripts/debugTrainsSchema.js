const { sequelize } = require('./models');

async function debugTrains() {
    try {
        const [results] = await sequelize.query('SHOW INDEX FROM trains');
        console.log(`Found ${results.length} indices on 'trains' table.`);
        results.forEach(idx => {
            console.log(`- ${idx.Key_name} (${idx.Column_name})`);
        });
    } catch (err) {
        console.error(err);
    }
}

debugTrains();
