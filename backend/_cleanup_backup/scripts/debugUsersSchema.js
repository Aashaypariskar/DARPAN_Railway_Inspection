const { sequelize } = require('./models');

async function debugUsers() {
    try {
        const [results] = await sequelize.query('SHOW INDEX FROM users');
        console.log(`Found ${results.length} indices on 'users' table.`);
        results.forEach(idx => {
            console.log(`- ${idx.Key_name} (${idx.Column_name})`);
        });
    } catch (err) {
        console.error(err);
    }
}

debugUsers();
