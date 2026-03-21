const sequelize = require('./config/db');

async function checkColumns() {
    try {
        const [sessionCols] = await sequelize.query("SHOW COLUMNS FROM commissionary_sessions");
        console.log('--- commissionary_sessions columns ---');
        console.log(sessionCols.map(c => c.Field));

        const [answerCols] = await sequelize.query("SHOW COLUMNS FROM commissionary_answers");
        console.log('\n--- commissionary_answers columns ---');
        console.log(answerCols.map(c => c.Field));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkColumns();
