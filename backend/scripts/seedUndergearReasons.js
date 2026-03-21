const { sequelize, Question, Reason } = require('../models');

async function seedReasons() {
    try {
        console.log('--- STARTING REASONS SEED FOR UNDERGEAR ---');
        const questions = await Question.findAll({ where: { category: 'Undergear' } });

        if (questions.length === 0) {
            console.log('No Undergear questions found in the DB.');
            process.exit(0);
        }

        const defaultReasons = [
            'Complete Failure',
            'Structural Damage',
            'Replacement Required',
            'Safety Hazard',
            'Beyond Repair',
            'Non-Functional'
        ];

        let addedCount = 0;
        for (const q of questions) {
            for (const text of defaultReasons) {
                const [reason, created] = await Reason.findOrCreate({
                    where: { question_id: q.id, text },
                    defaults: { question_id: q.id, text }
                });
                if (created) addedCount++;
            }
        }

        console.log(`Successfully mapped ${addedCount} reasons across ${questions.length} Undergear questions.`);
        process.exit(0);
    } catch (err) {
        console.error('Error mapping Undergear reasons:', err);
        process.exit(1);
    }
}

seedReasons();
