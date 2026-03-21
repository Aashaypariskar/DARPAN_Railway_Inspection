const { InspectionAnswer, PitLineTrain, PitLineCoach, PitLineSession, WspSession, CaiSession, CaiAnswer, Question, sequelize } = require('./models');
const { autosave } = require('./controllers/InspectionController');

async function debug() {
    const mockRes = { json: (d) => d, status: (s) => ({ json: (d) => d }) };

    try {
        console.log('1. Start');
        const q1 = await Question.findByPk(1);
        console.log('2. Question 1:', q1 ? 'OK' : 'FAIL');

        console.log('3. PitLine Clean');
        await PitLineTrain.destroy({ where: { train_number: 'DEBUG-PIT-99' } });

        console.log('4. PitLine Create');
        const t1 = await PitLineTrain.create({ train_number: 'DEBUG-PIT-99' });
        const c1 = await PitLineCoach.create({ train_id: t1.id, coach_number: 'B9' });
        const s1 = await PitLineSession.create({ train_id: t1.id, coach_id: c1.id, status: 'IN_PROGRESS' });
        console.log('5. PitLine Session ID:', s1.id);

        const pitReq = {
            body: {
                module_type: 'PITLINE',
                session_id: s1.id,
                train_id: t1.id,
                coach_id: c1.id,
                question_id: 1,
                status: 'OK'
            }
        };
        console.log('6. PitLine Autosave Start');
        await autosave(pitReq, mockRes);
        console.log('7. PitLine Autosave End');

        console.log('8. WSP Session Create');
        const wspSess = await WspSession.create({ coach_id: 1, status: 'IN_PROGRESS' });
        console.log('9. WSP Session ID:', wspSess.id);

        const wspReq = {
            body: {
                module_type: 'WSP',
                session_id: wspSess.id,
                question_id: 1,
                status: 'OK'
            }
        };
        console.log('10. WSP Autosave Start');
        await autosave(wspReq, mockRes);
        console.log('11. WSP Autosave End');

        process.exit(0);
    } catch (err) {
        console.error('CRASH AT STEP');
        console.error(err);
        process.exit(1);
    }
}

debug();
