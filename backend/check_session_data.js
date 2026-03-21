const { CommissionaryAnswer, CommissionarySession, Question, sequelize } = require('./models');
const { Op } = require('sequelize');

async function check() {
    try {
        const session = await CommissionarySession.findByPk(23);
        console.log('Session 23:', JSON.stringify(session, null, 2));

        const answers = await CommissionaryAnswer.findAll({
            where: { session_id: 23 },
            limit: 5
        });
        console.log('Sample Answers (5):', JSON.stringify(answers, null, 2));

        const totalAnswers = await CommissionaryAnswer.count({ where: { session_id: 23 } });
        console.log('Total Answers for Session 23:', totalAnswers);

        const counts = await CommissionaryAnswer.findAll({
            where: { session_id: 23 },
            attributes: [
                'subcategory_id', 'activity_type', 'compartment_id',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['subcategory_id', 'activity_type', 'compartment_id'],
            raw: true
        });
        console.log('Grouped Counts:', JSON.stringify(counts, null, 2));

        // Let's also check subcategory 119 questions
        const questions = await Question.findAll({
            where: { subcategory_id: 119 },
            limit: 5
        });
        console.log('Sample Questions for Subcategory 119:', JSON.stringify(questions, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

check();
