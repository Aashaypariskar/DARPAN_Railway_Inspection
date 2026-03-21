const { Reason, Question, LtrSchedule } = require('./models');

async function seedWspReasons() {
    try {
        console.log('--- STARTING WSP REASON SEEDING ---');

        // 1. Find all question IDs belonging to WSP
        // In this system, WSP questions are linked via schedule_id to LtrSchedule entries
        const wspQuestions = await Question.findAll({
            where: {
                schedule_id: { [require('sequelize').Op.ne]: null }
            }
        });

        console.log(`Found ${wspQuestions.length} potential WSP questions.`);

        const defaultReasons = [
            'Dirty',
            'Loose',
            'Broken',
            'Missing',
            'Damaged',
            'Worn Out'
        ];

        let createdCount = 0;

        for (const q of wspQuestions) {
            // Check if reasons already exist for this question
            const existingCount = await Reason.count({ where: { question_id: q.id } });

            if (existingCount === 0) {
                for (const text of defaultReasons) {
                    await Reason.create({
                        question_id: q.id,
                        text: text
                    });
                    createdCount++;
                }
            }
        }

        console.log(`Seeding complete. Created ${createdCount} reason records.`);
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedWspReasons();
