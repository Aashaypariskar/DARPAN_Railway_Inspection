const sequelize = require('../config/db');

async function check() {
    try {
        const [results] = await sequelize.query("SHOW COLUMNS FROM users LIKE 'status'");
        console.log(results);

        const [users] = await sequelize.query("SELECT id, email, status FROM users LIMIT 5");
        console.log(users);
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
check();
