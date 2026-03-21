const { InspectionAnswer, PitLineTrain, PitLineCoach, PitLineSession, WspSession, CaiSession, CaiAnswer, sequelize } = require('./models');

async function verify() {
    try {
        console.log('--- STARTING COMPREHENSIVE SAFETY VERIFICATION ---');

        // 1. PITLINE TEST
        console.log('[TEST] PitLine Isolated Block');
        const t1 = await PitLineTrain.create({ train_number: 'PIT-TEST-01' });
        const c1 = await PitLineCoach.create({ train_id: t1.id, coach_number: 'B1' });
        const s1 = await PitLineSession.create({ train_id: t1.id, coach_id: c1.id, status: 'IN_PROGRESS' });

        const { autosave } = require('./controllers/InspectionController');
        const mockRes = { json: (d) => d, status: (s) => ({ json: (d) => d }) };

        // Test PitLine Autosave
        const pitReq = {
            body: {
                module_type: 'PITLINE',
                session_id: s1.id,
                train_id: t1.id,
                coach_id: c1.id,
                question_id: 1, // Assumes question 1 exists
                status: 'OK',
                remarks: 'Safe Test'
            }
        };
        await autosave(pitReq, mockRes);
        const pitAns = await InspectionAnswer.findOne({ where: { train_id: t1.id, coach_id: c1.id, module_type: 'PITLINE' } });
        if (pitAns) console.log('SUCCESS: PitLine isolated autosave verified');
        else throw new Error('PitLine autosave failed');

        // 2. WSP REGRESSION TEST
        console.log('[TEST] WSP Regression (Zero Regression Rule)');
        // Need a WSP session
        const wspSess = await WspSession.create({ coach_id: 1, status: 'IN_PROGRESS' });
        const wspReq = {
            body: {
                module_type: 'WSP',
                session_id: wspSess.id,
                question_id: 1,
                status: 'DEFICIENCY',
                remarks: 'WSP Regression Test'
            }
        };
        await autosave(wspReq, mockRes);
        const wspAns = await InspectionAnswer.findOne({ where: { session_id: wspSess.id, question_id: 1 } });
        if (wspAns && wspAns.status === 'DEFICIENCY') console.log('SUCCESS: WSP regression verified');
        else throw new Error('WSP regression failed');

        // 3. CAI REGRESSION TEST
        console.log('[TEST] CAI Regression');
        const caiSess = await CaiSession.create({ coach_id: 1, status: 'IN_PROGRESS' });
        const caiReq = {
            body: {
                module_type: 'CAI',
                session_id: caiSess.id,
                question_id: 1,
                status: 'OK',
                remarks: 'CAI Regression Test'
            }
        };
        await autosave(caiReq, mockRes);
        const caiAns = await CaiAnswer.findOne({ where: { session_id: caiSess.id, question_id: 1 } });
        if (caiAns) console.log('SUCCESS: CAI regression verified');
        else throw new Error('CAI regression failed');

        // 4. CLEANUP
        console.log('[CLEANUP]');
        await PitLineTrain.destroy({ where: { id: t1.id } });
        await WspSession.destroy({ where: { id: wspSess.id } });
        await CaiSession.destroy({ where: { id: caiSess.id } });

        console.log('--- ALL VERIFICATIONS PASSED ---');
        process.exit(0);
    } catch (err) {
        console.error('VERIFICATION FAILED:', err);
        process.exit(1);
    }
}

verify();
