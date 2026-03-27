const {
    SickLineSession,
    SickLineAnswer,
    Coach,
    AmenitySubcategory,
    AmenityItem,
    Question,
    Activity,
    InspectionAnswer,
    sequelize
} = require('../models');
const SessionStatusService = require('../services/SessionStatusService');
const SessionResolutionService = require('../services/SessionResolutionService');
const { Op } = require('sequelize');
const { calculateCompliance } = require('../utils/compliance');

// GET /api/sickline/coaches (Using shared Coach model but separate session flow)
exports.listCoaches = async (req, res) => {
    try {
        const where = { module_type: 'SICKLINE' };
        
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
        res.status(500).json({ error: 'Failed to list coaches' });
    }
};

// POST /api/sickline/coaches
exports.createCoach = async (req, res) => {
    try {
        const { coach_number, coach_type } = req.body;
        if (!coach_number) return res.status(400).json({ error: 'Coach number is required' });

        const existing = await Coach.findOne({ where: { coach_number } });
        if (existing) return res.status(400).json({ error: 'Coach number already exists' });

        const coach = await Coach.create({
            coach_number,
            coach_type,
            module_type: 'SICKLINE',
            created_by: req.user.id,
            train_id: 1 // Dummy default
        });
        res.json(coach);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
};

// DELETE /api/sickline/coaches/:id
exports.deleteCoach = async (req, res) => {
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
        res.status(500).json({ error: 'Failed' });
    }
};

// GET /api/sickline/session?coach_number=X
exports.getOrCreateSession = async (req, res) => {
    try {
        const { coach_number } = req.query;
        if (!coach_number) return res.status(400).json({ error: 'Coach number is required' });

        const coach = await Coach.findOne({ where: { coach_number } });

        console.log("SESSION INIT:", {
            coach_id: coach?.id,
            coach_number,
            coach_module_type: coach?.module_type,
            expected_module: 'SICKLINE'
        });

        if (!coach) return res.status(404).json({ error: 'Coach not found' });

        // Hard Validation: Ensure coach belongs to this module
        if (coach.module_type !== 'SICKLINE') {
            return res.status(400).json({ error: 'Invalid coach module for this session type' });
        }

        const today = new Date().toISOString().split('T')[0];

        let session = await SickLineSession.findOne({
            where: {
                coach_id: coach.id,
                inspection_date: today,
                status: { [Op.in]: ['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED'] }
            },
            order: [['createdAt', 'DESC']]
        });

        console.log(`[SICKLINE] Session lookup for coach_id:${coach.id} found:`, session ? `SES-${session.id} (${session.status})` : 'None');

        // Only create new session if none exists OR the existing one is CLOSED
        if (!session || session.status === 'CLOSED') {
            session = await SickLineSession.create({
                coach_id: coach.id,
                coach_number: coach.coach_number,
                inspection_date: today,
                created_by: req.user.id,
                status: 'IN_PROGRESS'
            });
            console.log(`[SICKLINE] New session created: ${session.id}`);
        } else {
            console.log(`[SICKLINE] Resuming session: ${session.id} (status: ${session.status})`);
        }

        res.json(session);
    } catch (err) {
        console.error('SickLine Session Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
};

// GET /api/sickline/questions
exports.getQuestions = async (req, res) => {
    try {
        const questions = await Question.findAll({
            where: {
                section_code: 'SS1-C',
                ss1_flag: 'C'
            },
            order: [
                ['section_order', 'ASC'],
                ['display_order', 'ASC'],
                ['id', 'ASC']
            ]
        });

        // Use a Set or Map to preserve insertion order of sections
        const sectionMap = new Map();

        questions.forEach(q => {
            if (!sectionMap.has(q.item_name)) {
                sectionMap.set(q.item_name, {
                    item_name: q.item_name,
                    questions: []
                });
            }
            sectionMap.get(q.item_name).questions.push(q);
        });

        const result = Array.from(sectionMap.values());

        res.json(result);
    } catch (err) {
        console.log("SickLine getQuestions error", err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/sickline/answers
exports.getAnswers = async (req, res) => {
    try {
        const { session_id } = req.query;
        if (!session_id) {
            return res.status(400).json({ error: 'Missing session_id' });
        }

        const session = await SessionResolutionService.resolveSession(session_id, 'SICKLINE');
        if (!session) return res.status(404).json({ error: 'Session not found' });

        // --- DATA ISOLATION ---
        if (req.user && req.user.role !== 'SUPER_ADMIN' && session.created_by !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized: Access denied' });
        }

        const answers = await SickLineAnswer.findAll({
            where: { 
                session_id,
                coach_id: session.coach_id
            },
            attributes: [
                'id', 'question_id', 'status', 'reasons', 'remarks', 'photo_url',
                'resolved', 'after_photo_url', 'resolution_remark'
            ]
        });

        res.json(answers);
    } catch (err) {
        console.error('getAnswers Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
};

// POST /api/sickline/save
exports.saveAnswers = async (req, res) => {
    try {
        const { session_id, compartment_id, subcategory_id, activity_type, question_id, status, remarks } = req.body;

        if (!session_id || !question_id) return res.status(400).json({ message: "Missing required fields" });

        // Phase 26: Softened Save Validation for progress tracking
        // Deficiency validation will be enforced during submission

        let parsedReasons = [];
        if (req.body.reasons) {
            try {
                parsedReasons = typeof req.body.reasons === 'string' ? JSON.parse(req.body.reasons) : req.body.reasons;
            } catch (e) { parsedReasons = []; }
        }

        const session = await SessionResolutionService.resolveSession(session_id, 'SICKLINE');
        if (!session) return res.status(404).json({ error: 'Session not found' });

        // --- DATA ISOLATION ---
        if (req.user && req.user.role !== 'SUPER_ADMIN' && session.created_by !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const qData = await Question.findByPk(question_id);

        let ansRecord = await SickLineAnswer.findOne({
            where: { 
                session_id, 
                question_id,
                coach_id: session.coach_id,
                compartment_id: compartment_id || 'NA',
                subcategory_id: subcategory_id || 0,
                activity_type: activity_type || 'Major'
            }
        });

        // Evaluate completeness for locking
        let isComplete = false;
        if (status === 'DEFICIENCY') {
            const hasReasons = Array.isArray(parsedReasons) && parsedReasons.length > 0;
            const hasRemark = !!remarks;
            const hasPhoto = !!photo_url;
            if (hasReasons && hasRemark && hasPhoto) {
                isComplete = true;
            }
        }

        if (ansRecord) {
            // Check if locked
            if (ansRecord.defect_locked) {
                return res.status(403).json({ error: 'This defect is locked and cannot be modified from the checklist.' });
            }

            await ansRecord.update({
                status: status || 'OK',
                reasons: parsedReasons,
                remarks: remarks || '',
                photo_url: photo_url || ansRecord.photo_url,
                question_text_snapshot: qData?.text || ansRecord.question_text_snapshot,
                defect_locked: isComplete ? 1 : 0
            });
        } else {
            ansRecord = await SickLineAnswer.create({
                session_id, 
                question_id,
                coach_id: session.coach_id,
                compartment_id: compartment_id || 'NA',
                subcategory_id: subcategory_id || 0,
                activity_type: activity_type || 'Major',
                status: status || 'OK',
                reasons: parsedReasons,
                remarks: remarks || '',
                photo_url,
                question_text_snapshot: qData?.text || 'Standard Question',
                defect_locked: isComplete ? 1 : 0
            });
        }

        // Phase 26: Trigger Reporting Projection (ASYNCHRONOUS via setImmediate)
        const ReportingProjectionService = require('../services/ReportingProjectionService');
        setImmediate(() => {
            ReportingProjectionService.projectSession(session_id, 'SICKLINE')
                .catch(err => console.error(`[SICKLINE SAVE PROJECTION ERROR] session:${session_id}`, err));
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("SickLine Save Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// GET /api/sickline/progress
exports.getProgress = async (req, res) => {
    try {
        const sessionId = req.query.session_id;

        const total = await Question.count({
            where: {
                section_code: 'SS1-C',
                ss1_flag: 'C'
            }
        });

        const session = await SickLineSession.findByPk(sessionId);
        if (!session) return res.json({ totalQuestions: total, answeredCount: 0 });

        // --- DATA ISOLATION ---
        if (req.user && req.user.role !== 'SUPER_ADMIN' && session.created_by !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const answered = await SickLineAnswer.count({
            where: {
                session_id: sessionId,
                coach_id: session.coach_id
            }
        });

        res.json({
            totalQuestions: total,
            answeredCount: answered,
            status: session.status
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/sickline/complete
exports.completeSession = async (req, res) => {
    try {
        const { coach_number } = req.body;
        const coach = await Coach.findOne({ where: { coach_number } });
        if (!coach) return res.status(404).json({ error: 'Coach not found' });

        const today = new Date().toISOString().split('T')[0];
        const session = await SickLineSession.findOne({ where: { coach_id: coach.id, inspection_date: today } });
        if (!session) return res.status(404).json({ error: 'Session not found' });

        // --- DATA ISOLATION ---
        if (req.user && req.user.role !== 'SUPER_ADMIN' && session.created_by !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await SessionStatusService.updateStatus(session.id, 'SICKLINE', 'COMPLETED');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
};

// POST /api/sickline/submit
exports.submitSession = async (req, res) => {
    try {
        const { session_id, submission_timestamp } = req.body;
        if (!session_id) return res.status(400).json({ error: 'session_id is required' });

        // Phase 1: Submission Integrity/Race Condition Protection
        if (submission_timestamp) {
            const latestAnswer = await SickLineAnswer.findOne({
                where: { session_id },
                order: [['updatedAt', 'DESC']]
            });

            if (latestAnswer && new Date(latestAnswer.updatedAt) > new Date(submission_timestamp)) {
                console.error(`[SICKLINE SUBMIT REJECTED] Race condition for session ${session_id}`);
                return res.status(400).json({ 
                    error: 'Submission blocked: Data modified during submission. Please refresh and try again.',
                    retry_recommended: true 
                });
            }
        }

        const session = await SickLineSession.findByPk(session_id);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        // Submission Integrity Check: Ensure all questions for SS1-C have been answered
        const [totalQuestions, answeredCount] = await Promise.all([
            Question.count({
                where: {
                    section_code: 'SS1-C',
                    ss1_flag: 'C'
                }
            }),
            SickLineAnswer.count({ where: { session_id } })
        ]);

        if (answeredCount < totalQuestions) {
            return res.status(400).json({
                error: `Submission blocked: Only ${answeredCount}/${totalQuestions} answers recorded on server. Please ensure all questions are answered and saved.`,
                missingCount: totalQuestions - answeredCount
            });
        }

        // New behavior: Submission allowed even with unresolved defects.
        await SessionStatusService.updateStatus(session.id, 'SICKLINE', 'SUBMITTED');
        res.json({ success: true, message: 'Inspection submitted and locked' });
    } catch (err) {
        console.error('SickLine Submit Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
};

// GET /api/sickline/combined-report
exports.getCombinedReport = async (req, res) => {
    try {
        const { session_id } = req.query;
        if (!session_id) return res.status(400).json({ error: 'session_id is required' });

        const session = await SessionResolutionService.resolveSession(session_id, 'SICKLINE');
        if (!session) return res.status(404).json({ error: 'Session not found' });

        // --- DATA ISOLATION ---
        if (req.user && req.user.role !== 'SUPER_ADMIN' && session.created_by !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const answers = await SickLineAnswer.findAll({
            where: { session_id },
            include: [
                { model: Question, attributes: ['text', 'display_order'] },
                { model: AmenitySubcategory, attributes: ['name'] }
            ],
            order: [[AmenitySubcategory, 'id', 'ASC'], [Question, 'display_order', 'ASC']]
        });

        const matrixData = {};
        answers.forEach(ans => {
            const subId = ans.subcategory_id;
            const qId = ans.question_id;
            const compId = ans.compartment_id;

            if (!matrixData[subId]) {
                matrixData[subId] = { subName: ans.AmenitySubcategory.name, questions: {} };
            }
            if (!matrixData[subId].questions[qId]) {
                matrixData[subId].questions[qId] = { qText: ans.Question.text, cells: {} };
            }
            if (!matrixData[subId].questions[qId].cells[compId]) {
                matrixData[subId].questions[qId].cells[compId] = { Major: null, Minor: null };
            }
            matrixData[subId].questions[qId].cells[compId][ans.activity_type] = {
                status: ans.status,
                remark: ans.remarks,
                hasPhoto: !!ans.photo_url
            };
        });

        const overallCompliance = calculateCompliance(answers);
        const stats = { overall: overallCompliance, subcategories: {}, compartments: {} };
        const comps = [...new Set(answers.map(a => a.compartment_id))].filter(Boolean);
        comps.forEach(c => stats.compartments[c] = calculateCompliance(answers.filter(a => a.compartment_id === c)));
        Object.keys(matrixData).forEach(id => stats.subcategories[id] = calculateCompliance(answers.filter(a => a.subcategory_id == id)));

        res.json({
            coach_number: session.coach_number,
            date: session.inspection_date,
            matrix: matrixData,
            stats,
            compartments: comps
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
};
