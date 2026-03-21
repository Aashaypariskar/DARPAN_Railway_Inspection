const InspectionController = require('./controllers/InspectionController');
const { sequelize, PitLineSession, PitLineTrain, PitLineCoach, Question, User, Role, WspSession } = require('./models');

async function setupTestData(count) {
    try {
        console.log('Setting up test data...');
        
        // Fetch first existing entities to ensure FK satisfaction
        const role = await Role.findOne() || (await Role.findOrCreate({ where: { id: 1 }, defaults: { role_name: 'Admin' } }))[0];
        console.log(` - Using Role: ${role.id}`);

        const user = await User.findOne() || (await User.findOrCreate({ 
            where: { id: 1 }, 
            defaults: { name: 'Admin', email: 'admin@example.com', password: 'password', role_id: role.id } 
        }))[0];
        console.log(` - Using User: ${user.id}`);

        const ptrain = await PitLineTrain.findOne() || (await PitLineTrain.findOrCreate({ 
            where: { train_number: '12345' }, 
            defaults: { id: 1 } 
        }))[0];
        console.log(` - Using PitLineTrain: ${ptrain.id}`);

        const pcoach = await PitLineCoach.findOne({ where: { train_id: ptrain.id } }) || (await PitLineCoach.findOrCreate({ 
            where: { coach_number: 'C1' }, 
            defaults: { id: 1, train_id: ptrain.id, coach_name: 'Test Coach' } 
        }))[0];
        console.log(` - Using PitLineCoach: ${pcoach.id}`);

        // Use a high session ID to avoid overlap with real data
        const session_id = 9999 + Math.floor(Math.random() * 1000);
        
        console.log(` - Creating PitLineSession: ${session_id}...`);
        await PitLineSession.upsert({
            id: session_id,
            train_id: ptrain.id,
            coach_id: pcoach.id,
            inspection_date: new Date().toISOString().split('T')[0],
            inspector_id: user.id,
            status: 'IN_PROGRESS'
        });

        console.log(' - Ensuring Questions...');
        const currentQuestions = await Question.findAll({ limit: count });
        if (currentQuestions.length < count) {
            console.log(` - Creating ${count - currentQuestions.length} more dummy questions...`);
            const newQuestions = [];
            for (let i = currentQuestions.length + 1; i <= count; i++) {
                newQuestions.push({
                    text: `Test Question ${i}`,
                    is_active: 1
                });
            }
            await Question.bulkCreate(newQuestions, { ignoreDuplicates: true });
        }

        const questions = await Question.findAll({ limit: count });
        return { session_id, questionIds: questions.map(q => q.id) };
    } catch (err) {
        console.error('Setup failed:', err);
        if (err.parent) console.error('Parent Error:', err.parent);
        throw err;
    }
}

async function testBulkSave(count) {
    console.log(`\nTesting bulk save with ${count} answers...`);
    
    let session_id, questionIds;
    try {
        const data = await setupTestData(count);
        session_id = data.session_id;
        questionIds = data.questionIds;
    } catch (e) {
        return; // Skip if setup failed
    }

    const answers = [];
    for (let i = 0; i < Math.min(count, questionIds.length); i++) {
        answers.push({
            question_id: questionIds[i],
            status: 'OK',
            remarks: `Bulk test ${i}`,
            reason_ids: []
        });
    }

    const req = {
        body: {
            module_type: 'PITLINE',
            session_id,
            answers
        }
    };

    const res = {
        statusCode: 200,
        status: function(s) { this.statusCode = s; return this; },
        json: function(j) { 
            this.data = j; 
            console.log(`Status: ${this.statusCode}`);
            if (this.statusCode !== 200) {
                console.error('Server Error Data:', JSON.stringify(j));
            }
            return this; 
        }
    };

    try {
        const start = Date.now();
        await InspectionController.saveCheckpoint(req, res);
        const duration = Date.now() - start;
        console.log(`Total Duration: ${duration}ms`);
        
        if (duration < 1000) {
            console.log('✅ Performance within limits (< 1s)');
        } else {
            console.warn('⚠️ Performance warning (> 1s)');
        }
    } catch (error) {
        console.error('❌ Bulk save failed:', error);
    }
}

async function runTests() {
    try {
        await testBulkSave(50);
        await testBulkSave(100);
        await testBulkSave(200);
        console.log('\n--- ALL TESTS COMPLETED ---');
    } catch (err) {
        console.error('Test runner failed:', err);
    } finally {
        // Wait a bit for logs to flush before exit
        setTimeout(() => process.exit(0), 1000);
    }
}

runTests();
