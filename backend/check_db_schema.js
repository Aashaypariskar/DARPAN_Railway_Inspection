const sequelize = require('./config/db');

async function check() {
    try {
        const [results] = await sequelize.query("SHOW CREATE TABLE inspection_answers");
        console.log(results[0]['Create Table']);

        const [trains] = await sequelize.query("SELECT * FROM trains LIMIT 5");
        console.log('Trains sample:', trains);

        const [pitlineTrains] = await sequelize.query("SELECT * FROM pitline_trains LIMIT 5");
        console.log('PitLineTrains sample:', pitlineTrains);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
