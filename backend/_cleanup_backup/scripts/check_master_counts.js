const { Question, CaiQuestion, sequelize } = require('./models');

async function check() {
    try {
        console.log('--- MASTER QUESTION COUNTS ---');

        // CAI
        const caiCount = await CaiQuestion.count({ where: { is_active: true } });
        console.log('CAI (is_active=1):', caiCount);

        // SICKLINE
        const sickCount = await Question.count({ where: { section_code: 'SS1-C', ss1_flag: 'C' } });
        console.log('SICKLINE (SS1-C/C):', sickCount);

        // PITLINE - Guessing by section_code OR category
        const pitCount1 = await Question.count({ where: { section_code: { [require('sequelize').Op.like]: '%PIT%' } } });
        console.log('PITLINE (section_code LIKE %PIT%):', pitCount1);

        const pitCount2 = await Question.count({ where: { category: { [require('sequelize').Op.like]: '%PIT%' } } });
        console.log('PITLINE (category LIKE %PIT%):', pitCount2);

        // COMMISSIONARY (Category 6 usually)
        const commCount = await Question.count({ where: { subcategory_id: { [require('sequelize').Op.ne]: null } } });
        console.log('All Questions with subcategory_id:', commCount);

        // Sample Pitline question
        const samplePit = await Question.findOne({ where: { section_code: { [require('sequelize').Op.like]: '%PIT%' } } });
        if (samplePit) console.log('Sample PIT Question:', samplePit.toJSON());

    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}

check();
