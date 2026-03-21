const { Op } = require('sequelize');

/**
 * Dynamically calculates progress for a single subcategory based strictly on its questions.
 * Handles both single and dual-activity modes implicitly via strict question relationships.
 */
async function calculateProgress({
    subcategory_id,
    session_id,
    AnswerModel,
    AmenityItemModel,
    QuestionModel
}) {
    // 1. Get all required items for this subcategory that actually have questions mapped
    const requiredItems = await AmenityItemModel.findAll({
        where: { subcategory_id },
        include: [{
            model: QuestionModel,
            required: true,
            where: { subcategory_id },
            attributes: ['id']
        }],
        attributes: ['id', 'name']
    });

    const totalRequired = requiredItems.length;

    if (totalRequired === 0) {
        return {
            totalRequired: 0,
            completed: 0,
            percentage: 0,
            status: 'PENDING'
        };
    }

    // 2. Map items to their exact expected questions
    const allQuestionIds = [];

    requiredItems.forEach(item => {
        const qList = item.Questions || [];
        allQuestionIds.push(...qList.map(q => q.id));
    });

    // 3. Find unique answered questions for this session
    const answeredQs = await AnswerModel.findAll({
        where: {
            session_id,
            question_id: allQuestionIds
        },
        attributes: ['question_id'],
        group: ['question_id'] // Ensure we just fetch unique instances
    });

    const answeredSet = new Set(answeredQs.map(a => a.question_id));

    // 4. Determine strict completion per item based on question-level equality
    let completed = 0;

    requiredItems.forEach(item => {
        const qList = item.Questions || [];
        const expectedCount = qList.length;

        let thisItemAnswered = 0;
        qList.forEach(q => {
            if (answeredSet.has(q.id)) {
                thisItemAnswered++;
            }
        });

        // STRICT RULE: Only mark an item complete when ALL its questions are answered! 
        // No partial answers are counted as item completion.
        if (expectedCount > 0 && thisItemAnswered === expectedCount) {
            completed++;
        }
    });

    // 5. Count pending defects (status='DEFICIENCY' and resolved=false)
    const pendingDefects = await AnswerModel.count({
        where: {
            session_id,
            subcategory_id,
            status: 'DEFICIENCY',
            resolved: false
        }
    });

    const percentage = Math.round((completed / totalRequired) * 100) || 0;

    let status = 'PENDING';
    if (completed > 0 && completed < totalRequired) status = 'IN_PROGRESS';
    if (completed === totalRequired && pendingDefects === 0) status = 'COMPLETED';
    else if (completed === totalRequired && pendingDefects > 0) status = 'IN_PROGRESS'; // Wait for resolution

    return {
        totalRequired,
        completed,
        pendingDefects,
        percentage,
        status
    };
}

module.exports = { calculateProgress };
