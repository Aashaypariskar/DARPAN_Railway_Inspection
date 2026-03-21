const { CaiQuestion } = require('./models');
const sequelize = require('./config/db');

async function verify() {
    try {
        await sequelize.authenticate();
        const count = await CaiQuestion.count();
        console.log(`--- Total CAI Questions: ${count} ---`);
        if (count === 33) {
            console.log('--- VERIFICATION SUCCESSFUL ---');
        } else {
            console.log('--- VERIFICATION FAILED ---');
        }
        process.exit(0);
    } catch (err) {
        console.error('Verification Error:', err);
        process.exit(1);
    }
}

verify();
