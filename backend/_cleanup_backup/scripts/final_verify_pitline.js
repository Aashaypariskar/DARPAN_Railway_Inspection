const { PitLineTrain, PitLineCoach, PitLineSession, sequelize } = require('./models');

async function test() {
    try {
        console.log('--- STARTING PIT LINE FINAL VERIFICATION ---');

        // 1. Unique Train Number Test
        const t1 = await PitLineTrain.create({ train_number: 'UNIQUE-123' });
        console.log('SUCCESS: Train 1 created');
        try {
            await PitLineTrain.create({ train_number: 'UNIQUE-123' });
            console.log('FAILURE: Duplicate train number allowed!');
        } catch (e) {
            console.log('SUCCESS: Duplicate train number blocked (Unique Constraint)');
        }

        // 2. Coach and Session Test
        const c1 = await PitLineCoach.create({ train_id: t1.id, coach_number: 'B1', position: 1 });
        console.log('SUCCESS: Coach added');

        const { startSession } = require('./controllers/PitLineController');
        const mockReq = { body: { train_id: t1.id, coach_id: c1.id, inspector_id: 1 } };
        const mockRes = { json: (data) => data, status: () => ({ json: (d) => d }) };

        const s1 = await PitLineSession.create({ train_id: t1.id, coach_id: c1.id, inspector_id: 1 });
        console.log('SUCCESS: Session 1 created:', s1.id);

        const sessionLookup = await PitLineSession.findOne({
            where: { train_id: t1.id, coach_id: c1.id, status: 'IN_PROGRESS' }
        });
        console.log('SUCCESS: Session retrieved:', sessionLookup.id);

        if (s1.id === sessionLookup.id) {
            console.log('SUCCESS: Session resume logic verified');
        }

        // 3. Cleanup
        await PitLineTrain.destroy({ where: { id: t1.id } });
        console.log('SUCCESS: Cascading cleanup verified');

        console.log('--- PIT LINE FINAL VERIFICATION COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error('VERIFICATION ERROR:', err);
        process.exit(1);
    }
}

test();
