const sequelize = require('./config/db');
const { QueryTypes } = require('sequelize');

async function check() {
    try {
        const cai4 = await sequelize.query('SELECT count(*) as c FROM reporting_sessions WHERE source_session_id=4 AND module_type="CAI"', { type: QueryTypes.SELECT });
        const sick14 = await sequelize.query('SELECT count(*) as c FROM reporting_sessions WHERE source_session_id=14 AND module_type="SICKLINE"', { type: QueryTypes.SELECT });

        console.log(`CAI Session 4 Count: ${cai4[0].c}`);
        console.log(`SICKLINE Session 14 Count: ${sick14[0].c}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
