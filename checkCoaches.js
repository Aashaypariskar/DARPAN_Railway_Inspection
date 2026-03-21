const { Coach } = require('./backend/models');

async function check() {
    try {
        const coaches = await Coach.findAll();
        console.log('--- COACHES IN DB ---');
        coaches.forEach(c => console.log(`ID: ${c.id}, TrainID: ${c.train_id}, Number: ${c.coach_number}`));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
