const { CaiQuestion, CaiSession, CaiAnswer, Coach, InspectionAnswer } = require('../models');
const SessionStatusService = require('../services/SessionStatusService');
const SessionResolutionService = require('../services/SessionResolutionService');

// GET /api/cai/questions
const getQuestions = async (req, res) => {
    try {
        const questions = await CaiQuestion.findAll({
            where: { is_active: true },
            order: [['cai_code', 'ASC']]
        });
        res.json(questions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/cai/coaches
const listCoaches = async (req, res) => {
    try {
        const where = { module_type: 'CAI' };
        
        // --- DATA ISOLATION ---
        if (req.user && req.user.role !== 'SUPER_ADMIN') {
            where.created_by = req.user.id;
        }

        const coaches = await Coach.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });
        res.json(coaches);
    } catch (err) {
        res.status(500).json({ error: 'Failed to list CAI coaches' });
    }
};

// POST /api/cai/coaches
const createCoach = async (req, res) => {
    try {
        const { coach_number, coach_type } = req.body;
        if (!coach_number) return res.status(400).json({ error: 'Coach number is required' });

        const existing = await Coach.findOne({ where: { coach_number } });
        if (existing) return res.status(400).json({ error: 'Coach number already exists' });

        const coach = await Coach.create({
            coach_number,
            coach_type,
            module_type: 'CAI',
            created_by: req.user.id
        });
        res.json(coach);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create CAI coach' });
    }
};

// DELETE /api/cai/coaches/:id
const deleteCoach = async (req, res) => {
    try {
        const { id } = req.params;

        // Validation: Verify no inspections exist in universal answer table
        const count = await InspectionAnswer.count({ where: { coach_id: id } });
        if (count > 0) {
            return res.status(400).json({ error: 'Cannot delete because inspections exist for this record.' });
        }

        const coach = await Coach.findByPk(id);
        if (!coach) return res.status(404).json({ error: 'Coach not found' });

        await coach.destroy();
        res.json({ success: true, message: 'Coach deleted successfully' });
    } catch (err) {
        console.error('deleteCoach Error:', err);
        res.status(500).json({ error: 'Failed to delete coach' });
    }
};

// GET /api/cai/answers?session_id=XX
const getAnswers = async (req, res) => {
    try {
        const { session_id } = req.query;
        if (!session_id) return res.status(400).json({ error: 'session_id is required' });

        const session = await SessionResolutionService.resolveSession(session_id, 'CAI');
        if (!session) return res.status(404).json({ error: 'Session not found' });

        // --- DATA ISOLATION ---
        if (req.user && req.user.role !== 'SUPER_ADMIN' && session.inspector_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized: Session ownership mismatch' });
        }

        const answers = await CaiAnswer.findAll({ 
            where: { 
                session_id,
                coach_id: session.coach_id,
                // CAI normally uses NA/0, but we'll accept both for robust recovery
                [require('sequelize').Op.or]: [
                    { subcategory_id: 0 },
                    { subcategory_id: null }
                ]
            } 
        });
        console.log(`[CAI] Fetched ${answers.length} answers for session_id: ${session_id}`);
        res.json(answers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/cai/session/start
const startSession = async (req, res) => {
    try {
        const { coach_id } = req.body;

        if (!coach_id) return res.status(400).json({ error: 'coach_id is required' });

        const coach = await Coach.findByPk(coach_id);
        console.log("SESSION INIT REQUEST:", { coach_id, coach_number: coach?.coach_number, inspector: req.user.id });

        if (!coach) return res.status(404).json({ error: 'Coach not found' });
        if (coach.module_type !== 'CAI') {
            return res.status(400).json({ error: 'Invalid coach module for this session type' });
        }

        const { Op } = require('sequelize');

        // Find latest active session: DRAFT, IN_PROGRESS, or SUBMITTED
        let session = await CaiSession.findOne({
            where: { coach_id, status: { [Op.in]: ['DRAFT', 'IN_PROGRESS', 'SUBMITTED'] } },
            order: [['createdAt', 'DESC']]
        });

        if (!session) {
            console.log(`[CAI] No active session found for coach_id: ${coach_id}. Creating new DRAFT.`);
            session = await CaiSession.create({
                coach_id,
                inspector_id: req.user.id,
                status: 'DRAFT'
            });
            console.log(`[CAI] New session created: ${session.id}`);
        } else {
            console.log(`[CAI] Resuming session: ${session.id} (status: ${session.status}) for coach ${coach.coach_number}`);
        }

        res.json({ session_id: session.id, status: session.status });
    } catch (err) {
        console.error('Cai startSession Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/cai/submit
const submitSession = async (req, res) => {
    try {
        const { session_id, submission_timestamp } = req.body;
        if (!session_id) return res.status(400).json({ error: 'session_id is required' });

        // Phase 1: Submission Integrity/Race Condition Protection
        if (submission_timestamp) {
            const latestAnswer = await CaiAnswer.findOne({
                where: { session_id },
                order: [['updatedAt', 'DESC']]
            });

            if (latestAnswer && new Date(latestAnswer.updatedAt) > new Date(submission_timestamp)) {
                console.error(`[CAI SUBMIT REJECTED] Race condition for session ${session_id}`);
                return res.status(400).json({ 
                    error: 'Submission blocked: Data modified during submission. Please refresh and try again.',
                    retry_recommended: true 
                });
            }
        }

        const session = await SessionResolutionService.resolveSession(session_id, 'CAI');
        if (!session) return res.status(404).json({ error: 'Session not found' });

        // --- DATA ISOLATION ---
        if (req.user && req.user.role !== 'SUPER_ADMIN' && session.inspector_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Submission Integrity Check: Ensure all active questions have been answered
        const [totalQuestions, answeredCount] = await Promise.all([
            CaiQuestion.count({ where: { is_active: true } }),
            CaiAnswer.count({ where: { session_id } })
        ]);

        if (answeredCount < totalQuestions) {
            return res.status(400).json({
                error: `Submission blocked: Only ${answeredCount}/${totalQuestions} answers recorded on server. Please ensure all questions are answered and saved.`,
                missingCount: totalQuestions - answeredCount
            });
        }

        // New behavior: Submission allowed even with unresolved defects.
        await SessionStatusService.updateStatus(session.id, 'CAI', 'SUBMITTED');

        // Trigger Reporting Projection
        const ReportingProjectionService = require('../services/ReportingProjectionService');
        setImmediate(() => {
            ReportingProjectionService.projectSession(session_id, 'CAI')
                .catch(err => console.error(`[CAI PROJECTION ERROR] ID:${session_id}`, err));
        });

        res.json({ success: true, message: 'CAI Inspection submitted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: POST /api/cai/questions/add
const addQuestion = async (req, res) => {
    try {
        const { cai_code, question_text } = req.body;
        if (!cai_code || !question_text) return res.status(400).json({ error: 'Missing fields' });

        const question = await CaiQuestion.create({ cai_code, question_text });
        res.json(question);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: POST /api/cai/questions/update
const updateQuestion = async (req, res) => {
    try {
        const { id, cai_code, question_text, is_active } = req.body;
        if (!id) return res.status(400).json({ error: 'Question ID is required' });

        const question = await CaiQuestion.findByPk(id);
        if (!question) return res.status(404).json({ error: 'Question not found' });

        if (cai_code !== undefined) question.cai_code = cai_code;
        if (question_text !== undefined) question.question_text = question_text;
        if (is_active !== undefined) question.is_active = is_active;

        await question.save();
        res.json(question);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getProgress = async (req, res) => {
    try {
        const { coach_number } = req.query;
        if (!coach_number) return res.status(400).json({ error: 'coach_number is required' });

        const coach = await Coach.findOne({ where: { coach_number, module_type: 'CAI' } });
        if (!coach) return res.status(404).json({ error: 'Coach not found' });

        const { Op } = require('sequelize');
        const session = await CaiSession.findOne({
            where: { coach_id: coach.id, status: { [Op.in]: ['DRAFT', 'IN_PROGRESS', 'SUBMITTED'] } },
            order: [['createdAt', 'DESC']]
        });

        // --- DATA ISOLATION ---
        if (session && req.user && req.user.role !== 'SUPER_ADMIN' && session.inspector_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const total = await CaiQuestion.count({ where: { is_active: true } });
        let answered = 0;
        let status = 'NOT_STARTED';

        if (session) {
            answered = await CaiAnswer.count({ 
                where: { 
                    session_id: session.id,
                    coach_id: session.coach_id,
                    // CAI normally uses NA/0, but we'll accept both for robust recovery
                    [require('sequelize').Op.or]: [
                        { subcategory_id: 0 },
                        { subcategory_id: null }
                    ]
                } 
            });
            status = session.status;
            if (status === 'DRAFT') status = 'IN_PROGRESS';
            if (status === 'SUBMITTED' && answered < total) status = 'IN_PROGRESS';
        }

        res.json({ answered, total, status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getQuestions,
    getAnswers,
    startSession,
    submitSession,
    addQuestion,
    updateQuestion,
    listCoaches,
    createCoach,
    deleteCoach,
    getProgress
};
