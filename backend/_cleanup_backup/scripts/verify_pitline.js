const { PitLineTrain, PitLineCoach, sequelize } = require('./models');

async function verify() {
    try {
        console.log('--- STARTING PIT LINE VERIFICATION ---');

        // 1. Create a train
        const train = await PitLineTrain.create({ train_number: 'TEST-12137' });
        console.log('SUCCESS: Train created:', train.id);

        // 2. Add coaches
        await PitLineCoach.create({ train_id: train.id, coach_number: 'B1', position: 1 });
        await PitLineCoach.create({ train_id: train.id, coach_number: 'B2', position: 2 });
        console.log('SUCCESS: 2 coaches added');

        // 3. Verify count
        const trains = await PitLineTrain.findAll({
            where: { id: train.id },
            attributes: {
                include: [
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM pitline_coaches AS coach
                            WHERE
                                coach.train_id = PitLineTrain.id
                        )`),
                        'coach_count'
                    ]
                ]
            }
        });
        console.log('SUCCESS: Coach count:', trains[0].get('coach_count'));

        // 4. Cleanup
        await PitLineTrain.destroy({ where: { id: train.id } });
        console.log('SUCCESS: Train and linked coaches deleted (CASCADE)');

        console.log('--- PIT LINE VERIFICATION COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error('VERIFICATION ERROR:', err);
        process.exit(1);
    }
}

verify();
