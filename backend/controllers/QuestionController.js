const { Question, Activity, Category, Reason } = require('../models');

/**
 * QuestionController - Admin Question Management
 * Allows dynamic CRUD operations on inspection questions
 */

// GET /api/questions?activity_id=X (All authenticated users)
exports.getQuestionsByActivity = async (req, res) => {
    try {
        const { activity_id, schedule_id, module_type, subcategory_id, categoryName } = req.query;

        // UNDERGEAR Branch (Must bypass generic filtering)
        if (categoryName?.toLowerCase() === 'undergear') {
            const questions = await Question.findAll({
                where: {
                    category: 'Undergear',
                    is_active: 1
                },
                order: [['display_order', 'ASC']]
            });
            return res.json({ questions });
        }

        // WSP Branch — queries generic questions table by schedule_id
        if (module_type === 'WSP') {
            if (!schedule_id) {
                return res.status(400).json({ error: 'schedule_id is required for WSP' });
            }
            const questions = await Question.findAll({
                where: { schedule_id },
                order: [['display_order', 'ASC'], ['id', 'ASC']]
            });
            return res.json({ questions });
        }

        // SICKLINE Branch — queries by section_code/ss1_flag (same as SickLineController)
        if (module_type === 'SICKLINE') {
            const questions = await Question.findAll({
                where: { section_code: 'SS1-C', ss1_flag: 'C' },
                order: [['section_order', 'ASC'], ['display_order', 'ASC'], ['id', 'ASC']]
            });
            return res.json({ questions });
        }

        // DEFAULT Generic Branch
        if (!activity_id && !schedule_id && !subcategory_id) {
            return res.status(400).json({ error: 'activity_id, schedule_id, or subcategory_id is required' });
        }

        const where = {};
        if (activity_id) where.activity_id = activity_id;
        if (schedule_id) where.schedule_id = schedule_id;
        if (subcategory_id) where.subcategory_id = subcategory_id;

        const questions = await Question.findAll({
            where,
            order: [['display_order', 'ASC']] // Match requested layout config
        });

        res.json({ questions }); // Returning consistent wrapper
    } catch (err) {
        console.error('Get Questions Error:', err);
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
};

// POST /api/admin/question (Admin only)
exports.createQuestion = async (req, res) => {
    try {
        console.log('[DEBUG] createQuestion Body:', req.body);
        const { activity_id, schedule_id, subcategory_id, section_code, item_name, text, specified_value, answer_type, unit } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'text is required' });
        }

        const questionData = { text, specified_value, answer_type: answer_type || 'BOOLEAN', unit };
        if (activity_id) questionData.activity_id = activity_id;
        if (schedule_id) questionData.schedule_id = schedule_id;
        if (subcategory_id) questionData.subcategory_id = subcategory_id;
        if (section_code) questionData.section_code = section_code;
        if (item_name) questionData.item_name = item_name;

        const question = await Question.create(questionData);

        // Auto-seed default reasons ONLY if activity_id is provided and it's a BOOLEAN question
        if (activity_id && question.answer_type === 'BOOLEAN') {
            const activity = await Activity.findByPk(activity_id);
            if (activity) {
                const defaultMinorReasons = ['Dirty', 'Broken', 'Missing', 'Loose', 'Worn Out', 'Damaged'];
                const defaultMajorReasons = ['Complete Failure', 'Structural Damage', 'Replacement Required', 'Safety Hazard', 'Beyond Repair'];
                const reasonsToSeed = activity.type === 'Major' ? defaultMajorReasons : defaultMinorReasons;

                const reasonObjects = reasonsToSeed.map(rText => ({
                    question_id: question.id,
                    text: rText
                }));
                await Reason.bulkCreate(reasonObjects);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Question created successfully',
            question
        });
    } catch (err) {
        console.error('Create Question Error:', err);
        res.status(500).json({ error: 'Failed to create question' });
    }
};

// PUT /api/admin/question/:id (Admin only)
exports.updateQuestion = async (req, res) => {
    try {
        console.log('[DEBUG] updateQuestion ID:', req.params.id, 'Body:', req.body);
        const { id } = req.params;
        const { text, specified_value, answer_type, unit } = req.body;

        const question = await Question.findByPk(id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        if (text) question.text = text;
        if (specified_value !== undefined) question.specified_value = specified_value;
        if (answer_type) question.answer_type = answer_type;
        if (unit !== undefined) question.unit = unit;

        await question.save();

        res.json({
            success: true,
            message: 'Question updated successfully',
            question
        });
    } catch (err) {
        console.error('Update Question Error:', err);
        res.status(500).json({ error: 'Failed to update question' });
    }
};

// DELETE /api/admin/question/:id (Admin only)
exports.deleteQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        const question = await Question.findByPk(id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        await question.destroy();

        res.json({
            success: true,
            message: 'Question deleted successfully'
        });
    } catch (err) {
        console.error('Delete Question Error:', err);
        res.status(500).json({ error: 'Failed to delete question' });
    }
};
