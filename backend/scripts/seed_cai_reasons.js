const sequelize = require('../config/db');
const { CaiQuestion, Reason } = require('../models');

async function seed() {
    try {
        const questions = await CaiQuestion.findAll();
        for (const q of questions) {
            const reasonsCount = await Reason.count({ where: { question_id: q.id } });
            if (reasonsCount === 0) {
                console.log(`Seeding reasons for CAI Question ${q.id}: ${q.question_text}`);
                await Reason.bulkCreate([
                    { question_id: q.id, text: 'Bent/Broken/Damaged component' },
                    { question_id: q.id, text: 'Improper functioning/Not working' },
                    { question_id: q.id, text: 'Missing part/component' },
                    { question_id: q.id, text: 'Other (Specify in remarks)' }
                ]);
            }
        }
        console.log("Seeding complete.");
    } catch (e) {
        require('fs').writeFileSync('seed_error.txt', require('util').inspect(e, { showHidden: false, depth: null, colors: false }));
        console.error("Error seeding CAI reasons. Check seed_error.txt");
    }
    process.exit();
}
seed();
