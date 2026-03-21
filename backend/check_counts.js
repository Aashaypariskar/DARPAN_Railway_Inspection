const { CommissionarySession, CommissionaryAnswer, AmenitySubcategory, AmenityItem, Question, Coach } = require('./models');
const { Op } = require('sequelize');

async function debugProgress(coachNumber, moduleType) {
    try {
        const coach = await Coach.findOne({ where: { coach_number: coachNumber } });
        if (!coach) {
            console.log('Coach not found');
            return;
        }

        const session = await CommissionarySession.findOne({
            where: { coach_id: coach.id, module_type: moduleType },
            order: [['createdAt', 'DESC']]
        });

        if (!session) {
            console.log('Session not found');
            return;
        }

        console.log(`Analyzing Session ${session.id} for Coach ${coachNumber} (${moduleType})`);

        const subcategories = await AmenitySubcategory.findAll({ where: { category_id: 6 } });
        
        for (const sub of subcategories) {
            const majorItems = await AmenityItem.findAll({
                where: { subcategory_id: sub.id, activity_type: 'Major' },
                include: [{ model: Question, attributes: ['id'] }]
            });
            const minorItems = await AmenityItem.findAll({
                where: { subcategory_id: sub.id, activity_type: 'Minor' },
                include: [{ model: Question, attributes: ['id'] }]
            });

            const allItemsForTotal = await AmenityItem.findAll({
                where: { subcategory_id: sub.id },
                include: [{ model: Question, attributes: ['id'] }]
            });

            const majorIds = majorItems.flatMap(item => (item.Questions || []).map(q => q.id));
            const minorIds = minorItems.flatMap(item => (item.Questions || []).map(q => q.id));
            const allQuestionIds = allItemsForTotal.flatMap(item => (item.Questions || []).map(q => q.id));

            const totalAnswered = await CommissionaryAnswer.count({
                distinct: true,
                col: 'question_id',
                where: { session_id: session.id, subcategory_id: sub.id, module_type: moduleType, status: { [Op.not]: null } }
            });

            const majorAnswered = await CommissionaryAnswer.count({
                distinct: true,
                col: 'question_id',
                where: { session_id: session.id, question_id: majorIds, module_type: moduleType, status: { [Op.not]: null } }
            });

            const minorAnswered = await CommissionaryAnswer.count({
                distinct: true,
                col: 'question_id',
                where: { session_id: session.id, question_id: minorIds, module_type: moduleType, status: { [Op.not]: null } }
            });

            const compartments = ['NA', 'A', 'B', 'C', 'D'];
            const compDetails = {};
            const inspectionCompDetails = {};
            for (const c of compartments) {
                const ans = await CommissionaryAnswer.count({
                    distinct: true,
                    col: 'question_id',
                    where: { session_id: session.id, subcategory_id: sub.id, compartment_id: c, module_type: moduleType, status: { [Op.not]: null } }
                });
                compDetails[c] = ans;

                const iAns = await require('./models').InspectionAnswer.count({
                    distinct: true,
                    col: 'question_id',
                    where: { session_id: session.id, subcategory_id: sub.id, compartment_id: c, module_type: moduleType, status: { [Op.not]: null } }
                });
                inspectionCompDetails[c] = iAns;
            }

            console.log(`\n[${sub.id}] ${sub.name}:`);
            console.log(`  Total Qs: ${allQuestionIds.length}`);
            console.log(`  Answered Qs (Any Comp - Comm): ${totalAnswered}`);
            console.log(`  Major: ${majorAnswered}/${majorIds.length}`);
            console.log(`  Minor: ${minorAnswered}/${minorIds.length}`);
            console.log(`  CommAnswer Comp:`, compDetails);
            console.log(`  InspAnswer Comp:`, inspectionCompDetails);
        }

    } catch (err) {
        console.error(err);
    }
}

// Test for Commissionary
debugProgress('12301-B1', 'COMMISSIONARY').then(() => {
    // Test for Amenity
    debugProgress('12301-B1', 'AMENITY');
});
