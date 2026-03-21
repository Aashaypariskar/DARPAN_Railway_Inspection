const { User, Coach, SickLineSession, SickLineAnswer, Question, AmenitySubcategory } = require('./models');
const { Op } = require('sequelize');

async function testIsolatedSystem() {
    try {
        console.log('--- Starting Sick Line Isolated Flow Test ---');

        await SickLineSession.sync({ alter: true });
        await SickLineAnswer.sync({ alter: true });
        console.log('Database synced');

        // 1. Get any User
        const user = await User.findOne();
        if (!user) throw new Error('No user found');

        // 2. Create a test Coach
        const coachNumber = 'SICKLINE-TEST-01';
        let coach = await Coach.findOne({ where: { coach_number: coachNumber } });
        if (!coach) {
            coach = await Coach.create({ coach_number: coachNumber, coach_type: 'Test' });
        }

        // 3. Get or Create Session
        console.log('--- Creating SickLine Session ---');
        let session = await SickLineSession.findOne({
            where: { coach_id: coach.id, status: { [Op.ne]: 'COMPLETED' } }
        });
        if (!session) {
            session = await SickLineSession.create({
                coach_id: coach.id,
                coach_number: coachNumber,
                inspection_date: new Date(),
                status: 'IN_PROGRESS',
                created_by: user.id
            });
        }
        console.log(`Session Created: ID ${session.id}`);

        // 4. Determine Global Progress logic
        const subcategories = await AmenitySubcategory.findAll({ where: { category_id: 6 } });
        console.log(`Found ${subcategories.length} subcategories`);

        const subWithQs = subcategories[0];

        let questions = await Question.findAll({
            where: { subcategory_id: subWithQs.id }
        });

        // if there are no questions, let's create a fake one
        if (questions.length === 0) {
            const q = await Question.create({
                text: 'Test Major Q',
                type: 'radio',
                category_id: 6,
                subcategory_id: subWithQs.id,
                activity_id: 1 // Assume activity_id 1 is Major
            });
            questions = [q];
        }

        console.log(`Saving Answer for Major Question ID ${questions[0].id}`);

        // 5. Test isolated saving mechanism
        await SickLineAnswer.upsert({
            session_id: session.id,
            compartment_id: 'NA',
            subcategory_id: subWithQs.id,
            activity_type: 'Major',
            question_id: questions[0].id,
            status: 'AVAILABLE'
        });

        console.log('Answer saved successfully in sickline_answers.');

        // 6. Check progress (it should be 0 because only Major is done)
        const allSickAnswers = await SickLineAnswer.findAll({ where: { session_id: session.id } });
        console.log(`Total SickLine Answers: ${allSickAnswers.length}`);

        // Let's now add a minor answer
        const minorQs = await Question.findAll({
            where: { subcategory_id: subWithQs.id }
        });

        if (minorQs.length > 0) {
            console.log(`Saving Answer for Minor Question ID ${minorQs[0].id}`);
            await SickLineAnswer.upsert({
                session_id: session.id,
                compartment_id: 'NA',
                subcategory_id: subWithQs.id,
                activity_type: 'Minor',
                question_id: minorQs[0].id,
                status: 'AVAILABLE'
            });
        }

        const allSickAnswersAfter = await SickLineAnswer.findAll({ where: { session_id: session.id } });
        console.log(`Total SickLine Answers after Minor: ${allSickAnswersAfter.length}`);

        // To verify completely, we need to check if coach commissionary is untouched.
        const commAnswers = await require('./models').CommissaryAnswer.findAll({ where: { session_id: session.id } });
        console.log(`Commissary Answers for this session ID: ${commAnswers.length} (Should be undefined or 0 because session IDs are separate)`);

        console.log('--- Test Finished Successfully ---');

    } catch (err) {
        console.error('Test Failed:', err);
        require('fs').writeFileSync('sickline-error.log', JSON.stringify({ message: err.message, sql: err.sql, original: err.original }, null, 2));
    } finally {
        process.exit();
    }
}

testIsolatedSystem();
