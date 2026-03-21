const { sequelize } = require('../models');

async function run() {
    try {
        const [questions] = await sequelize.query("SELECT id FROM questions WHERE category = 'Undergear'");
        const reasons = [
            'Complete Failure',
            'Structural Damage',
            'Replacement Required',
            'Safety Hazard',
            'Beyond Repair',
            'Non-Functional'
        ];

        let count = 0;
        for (const q of questions) {
            for (const rText of reasons) {
                await sequelize.query(
                    'INSERT IGNORE INTO Reasons (question_id, text, created_at, updatedAt) VALUES (?, ?, NOW(), NOW())',
                    { replacements: [q.id, rText] }
                ).catch(err => {
                    // Try without timestamps if it fails
                    return sequelize.query(
                        'INSERT IGNORE INTO Reasons (question_id, text, created_at) VALUES (?, ?, NOW())',
                        { replacements: [q.id, rText] }
                    ).catch(e2 => {
                        return sequelize.query(
                            'INSERT IGNORE INTO Reasons (question_id, text) VALUES (?, ?)',
                            { replacements: [q.id, rText] }
                        );
                    });
                });
                count++;
            }
        }
        console.log('SEEDED: ' + count + ' reasons');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
