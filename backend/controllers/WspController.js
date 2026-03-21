const {
    Coach, PitLineCoach, LtrSchedule, LtrItem, Question, InspectionAnswer, WspSession, SickLineSession, User, Role, sequelize
} = require('../models');
const SessionStatusService = require('../services/SessionStatusService');
const { Op } = require('sequelize');

// GET /api/wsp/coaches
exports.listCoaches = async (req, res) => {
    try {
        const coaches = await Coach.findAll({
            where: { module_type: 'WSP' },
            order: [['createdAt', 'DESC']]
        });
        res.json(coaches);
    } catch (err) {
        res.status(500).json({ error: 'Failed to list WSP coaches' });
    }
};

// POST /api/wsp/coaches
exports.createCoach = async (req, res) => {
    try {
        const { coach_number, coach_type } = req.body;
        if (!coach_number) return res.status(400).json({ error: 'Coach number is required' });

        const existing = await Coach.findOne({ where: { coach_number } });
        if (existing) return res.status(400).json({ error: 'Coach number already exists' });

        const coach = await Coach.create({
            coach_number,
            coach_type,
            module_type: 'WSP',
            created_by: req.user.id
        });
        res.json(coach);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create WSP coach' });
    }
};

// DELETE /api/wsp/coaches/:id
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
        res.status(500).json({ error: 'Failed to delete coach' });
    }
};

exports.getOrCreateSession = async (req, res) => {
    try {
        const { coach_number } = req.query;
        if (!coach_number) return res.status(400).json({ error: 'Coach number is required' });

        let coach = await Coach.findOne({ where: { coach_number } });
        
        // Fallback: Check Pitline Coach table if not found in primary domain
        if (!coach) {
            const plc = await PitLineCoach.findOne({ where: { coach_number } });
            if (plc) {
                // Sync to primary coach table to satisfy Foreign Key constraints
                coach = await Coach.create({
                    coach_number: plc.coach_number,
                    coach_type: plc.coach_type || 'Unknown',
                    module_type: 'PITLINE', // Keep origin module
                    created_by: req.user ? req.user.id : 1
                });
            }
        }

        console.log("SESSION INIT:", {
            coach_id: coach?.id,
            coach_number,
            coach_module_type: coach?.module_type,
            expected_module: 'WSP'
        });

        if (!coach) return res.status(404).json({ error: 'Coach not found' });

        // Hard Validation: Ensure coach belongs to a valid module for WSP (WSP or PITLINE)
        if (coach.module_type !== 'WSP' && coach.module_type !== 'PITLINE') {
            return res.status(400).json({ error: 'Invalid coach module for this session type' });
        }

        const today = new Date().toISOString().split('T')[0];
        let session = await WspSession.findOne({
            where: {
                coach_id: coach.id,
                inspection_date: today,
                status: { [Op.in]: ['DRAFT', 'IN_PROGRESS', 'SUBMITTED'] }
            },
            order: [['createdAt', 'DESC']]
        });

        console.log(`[WSP] Session lookup for coach_id:${coach.id} found:`, session ? `SES-${session.id} (${session.status})` : 'None');

        // Only create a new session if none exists OR if the existing session is CLOSED
        if (!session || session.status === 'CLOSED') {
            session = await WspSession.create({
                coach_id: coach.id,
                coach_number: coach.coach_number,
                inspection_date: today,
                created_by: req.user.id,
                status: 'DRAFT'
            });
            console.log(`[WSP] New session created: ${session.id}`);
        } else {
            console.log(`[WSP] Resuming session: ${session.id} (status: ${session.status})`);
        }

        res.json(session);
    } catch (err) {
        console.error('WSP Session Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getSchedules = async (req, res) => {
    try {
        let schedules;
        try {
            schedules = await LtrSchedule.findAll({ where: { is_active: true } });
        } catch (e) {
            console.log('[WSP] is_active column missing, falling back');
            schedules = await LtrSchedule.findAll();
        }

        if (schedules.length === 0) {
            console.error('[CRITICAL] No WSP schedules found in database');
            return res.json([]);
        }

        // Deduplicate by name to prevent UI duplication (70 -> 7 schedules)
        const uniqueMap = new Map();
        schedules.forEach(s => {
            if (!uniqueMap.has(s.name)) {
                uniqueMap.set(s.name, s);
            }
        });
        const dedupedSchedules = Array.from(uniqueMap.values());

        console.log(`[WSP] Fetched ${schedules.length} schedules, returning ${dedupedSchedules.length} unique ones.`);
        res.json(dedupedSchedules);
    } catch (err) {
        console.error('[WSP ERROR] getSchedules:', err);
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
};

exports.getQuestions = async (req, res) => {
    try {
        const { schedule_id } = req.query;
        if (!schedule_id) return res.status(400).json({ error: 'schedule_id is required' });

        const items = await LtrItem.findAll({
            where: { schedule_id },
            include: [{
                model: Question,
                required: true,
            }],
            order: [
                ['display_order', 'ASC'],
                [{ model: Question }, 'display_order', 'ASC']
            ]
        });

        const grouped = items.map(item => ({
            item_name: item.name,
            questions: item.Questions
        }));

        console.log(`[DIAGNOSTIC-WSP] schedule_id: ${schedule_id}, items: ${items.length}, questions: ${grouped.reduce((a, b) => a + b.questions.length, 0)}`);

        res.json(grouped);
    } catch (err) {
        console.error('[CRITICAL-WSP] getQuestions:', err);
        res.status(500).json({ error: 'Failed to fetch questions' });
    }
};

exports.saveAnswers = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { session_id, mode, answers, coach_id, schedule_id } = req.body;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Invalid answers' });
        }

        let coach = await Coach.findByPk(coach_id);
        
        // Fallback: If not found in primary Coach table, check PitLineCoach (Pitline flow context)
        if (!coach) {
            const plc = await PitLineCoach.findByPk(coach_id);
            if (plc) {
                // Find or create in primary Coach table to ensure Foreign Key consistency
                [coach] = await Coach.findOrCreate({
                    where: { coach_number: plc.coach_number },
                    defaults: {
                        coach_type: plc.coach_type || 'Unknown',
                        module_type: 'PITLINE',
                        created_by: req.user ? req.user.id : 1
                    }
                });
            }
        }

        const user = await User.findByPk(req.user.id, { include: [Role] });
        const schedule = await LtrSchedule.findByPk(schedule_id);

        if (!coach || !user || !schedule) {
            console.error('[WSP SAVE ERROR] Missing context:', { coach: !!coach, user: !!user, schedule: !!schedule, coach_id });
            throw new Error('Missing context for save');
        }

        const validAnswers = answers.filter(a => a.status);
        if (validAnswers.length === 0) return res.json({ success: true, count: 0 });

        // Phase 26: Softened Save Validation for progress tracking
        // Deficiency validation will be enforced during submission


        const questionIds = validAnswers.map(a => a.question_id);
        const questionsList = await Question.findAll({
            where: { id: questionIds },
            include: [{ model: LtrItem, required: false }]
        });

        const records = validAnswers.map(ans => {
            const qData = questionsList.find(q => q.id === ans.question_id);
            if (!qData) throw new Error(`Question ${ans.question_id} not found`);

            // Phase: Evaluate Completeness for Locking
            let isLocked = false;
            if (ans.status === 'DEFICIENCY') {
                const hasReasons = Array.isArray(ans.reasons) && ans.reasons.length > 0;
                const hasRemark = !!ans.remarks;
                const hasPhoto = !!(ans.image_path || ans.photo_url);
                if (hasReasons && hasRemark && hasPhoto) {
                    isLocked = true;
                }
            }

            return {
                status: ans.status,
                observed_value: ans.observed_value,
                reasons: ans.reasons,
                remarks: ans.remarks,
                photo_url: ans.image_path || ans.photo_url,

                coach_id: coach.id,
                coach_number: coach.coach_number,
                user_id: user.id,
                user_name: user.name,
                role_snapshot: user.Role?.role_name,

                schedule_id: schedule.id,
                schedule_name: schedule.name,
                question_id: ans.question_id,
                question_text_snapshot: qData.text,
                item_name: qData.LtrItem?.name || 'Standard',

                submission_id: `WSP-${mode}-${session_id}-${Date.now()}`,
                session_id: session_id,
                category_name: 'WSP Examination',
                module_type: 'WSP',
                subcategory_id: null,
                defect_locked: isLocked ? 1 : 0
            };
        });

        // Reuse InspectionAnswer
        await InspectionAnswer.bulkCreate(records, { transaction });
        await transaction.commit();

        // Phase 26: Trigger Reporting Projection (ASYNCHRONOUS via setImmediate)
        const ReportingProjectionService = require('../services/ReportingProjectionService');
        const modeType = mode === 'SICKLINE' ? 'SICKLINE' : 'WSP';
        setImmediate(() => {
            ReportingProjectionService.projectSession(session_id, modeType)
                .catch(err => console.error(`[WSP SAVE PROJECTION ERROR] session:${session_id}`, err));
        });

        res.json({ success: true, saved: records.length });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('WSP Save Error:', err);
        res.status(500).json({ error: 'Failed to save answers' });
    }
};

exports.getAnswers = async (req, res) => {
    try {
        const { session_id, mode, schedule_id } = req.query;
        if (!session_id || !mode || !schedule_id) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        console.log(`[WSP ANSWERS] Fetching - Session: ${session_id}, Mode: ${mode}, Schedule: ${schedule_id}`);

        // Get the session to find the coach number
        let session;
        if (mode === 'SICKLINE') {
            session = await SickLineSession.findByPk(session_id, { include: [Coach] });
        } else {
            session = await WspSession.findByPk(session_id, { include: [Coach] });
        }

        const coach_number = session?.Coach?.coach_number;
        if (!coach_number) {
            console.log('[WSP ANSWERS] No coach found for session');
            return res.json([]);
        }

        const answers = await InspectionAnswer.findAll({
            where: {
                coach_number,
                category_name: 'WSP Examination',
                schedule_id,
                submission_id: {
                    [Op.like]: `WSP-${mode}-${session_id}-%`
                }
            },
            attributes: [
                'id', 'question_id', 'status', 'reasons', 'remarks',
                'photo_url', 'image_path', // Get both, photo_url is standard now
                'resolved', 'after_photo_url', 'resolution_remark'
            ]
        });

        res.json(answers);
    } catch (err) {
        console.error('[CRITICAL-WSP] getAnswers Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getProgress = async (req, res) => {
    try {
        const { coach_number, mode } = req.query;
        if (!coach_number) return res.status(400).json({ error: 'coach_number is required' });

        const coach = await Coach.findOne({ where: { coach_number } });
        if (!coach) {
            if (coach_number === 'GLOBAL' || coach_number === 'HEALTH_CHECK') {
                return res.json({ completed: false, completedCount: 0, totalCount: 0, status: 'UP' });
            }
            return res.status(404).json({ error: 'Coach not found' });
        }

        // 1. Get total schedules
        let schedules;
        try {
            schedules = await LtrSchedule.findAll({ where: { is_active: true } });
        } catch (e) {
            schedules = await LtrSchedule.findAll();
        }
        const totalCount = schedules.length;

        // 2. Identify session context
        let session;
        const today = new Date().toISOString().split('T')[0];

        if (mode === 'SICKLINE') {
            session = await SickLineSession.findOne({
                where: { coach_id: coach.id, inspection_date: today }
            });
        } else {
            session = await WspSession.findOne({
                where: { coach_id: coach.id, inspection_date: today }
            });
        }

        if (!session) {
            // Fallback: For Pitline-initiated WSP, no WspSession exists.
            // Check InspectionAnswer directly by coach_number + category_name.
            const directAnswers = await InspectionAnswer.findAll({
                where: {
                    coach_number: coach.coach_number,
                    category_name: 'WSP Examination'
                },
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('schedule_id')), 'schedule_id']]
            });
            const completedCount = directAnswers.length;
            return res.json({
                completed: totalCount > 0 && completedCount >= totalCount,
                completedCount,
                totalCount
            });
        }

        // 3. Count distinct schedules answered for this session
        // We match by coach_number, category_name, and session_id extracted from submission_id
        // Since we didn't add the session_id column, we use the tagging logic
        const answers = await InspectionAnswer.findAll({
            where: {
                coach_number: coach.coach_number,
                category_name: 'WSP Examination',
                submission_id: {
                    [Op.like]: `WSP-${mode}-${session.id}-%`
                }
            },
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('schedule_id')), 'schedule_id']]
        });

        const completedCount = answers.length;

        // 4. Count pending defects for this WSP session/mode
        const pendingDefects = await InspectionAnswer.count({
            where: {
                coach_number: coach.coach_number,
                category_name: 'WSP Examination',
                submission_id: {
                    [Op.like]: `WSP-${mode}-${session.id}-%`
                },
                status: 'DEFICIENCY',
                resolved: { [Op.or]: [false, null] }
            }
        });

        res.json({
            completed: (totalCount > 0) ? (completedCount === totalCount && pendingDefects === 0) : false,
            completedCount,
            totalCount,
            pendingDefects,
            pending_defects: pendingDefects,
            status: session.status
        });
    } catch (err) {
        console.error('[CRITICAL-WSP] getProgress Error:', err);
        res.status(500).json({ error: 'Internal server error while fetching progress' });
    }
};
// POST /api/wsp/submit
exports.submitSession = async (req, res) => {
    try {
        const { session_id, submission_timestamp } = req.body;
        if (!session_id) return res.status(400).json({ error: 'session_id is required' });

        // Phase 1: Submission Integrity/Race Condition Protection
        if (submission_timestamp) {
            const latestAnswer = await InspectionAnswer.findOne({
                where: { session_id, module_type: 'WSP' },
                order: [['updatedAt', 'DESC']]
            });

            if (latestAnswer && new Date(latestAnswer.updatedAt) > new Date(submission_timestamp)) {
                console.error(`[WSP SUBMIT REJECTED] Race condition for session ${session_id}`);
                return res.status(400).json({
                    error: 'Submission blocked: Data modified during submission. Please refresh and try again.',
                    retry_recommended: true
                });
            }
        }

        const session = await WspSession.findByPk(session_id, { include: [Coach] });
        if (!session) return res.status(404).json({ error: 'Session not found' });

        // Submission Integrity Check: Ensure all schedules have been addressed
        const coach = session.Coach;
        if (!coach) return res.status(500).json({ error: 'Coach context lost for session' });

        // Get total schedules
        let schedules;
        try {
            schedules = await LtrSchedule.findAll({ where: { is_active: true } });
        } catch (e) {
            schedules = await LtrSchedule.findAll();
        }
        const totalCount = schedules.length;

        // Count distinct schedules answered for this session
        // Use dynamic mode from request, or fallback to wildcard scan
        const mode = req.body.mode || null;
        const submissionIdFilter = mode
            ? { [Op.like]: `WSP-${mode}-${session.id}-%` }
            : { [Op.like]: `WSP-%-${session.id}-%` };

        const answeredSchedules = await InspectionAnswer.findAll({
            where: {
                coach_number: coach.coach_number,
                category_name: 'WSP Examination',
                submission_id: submissionIdFilter
            },
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('schedule_id')), 'schedule_id']]
        });

        // 2. Answers Check
        const answeredSchedulesRows = await InspectionAnswer.findAll({
            where: {
                session_id: session.id,
                module_type: 'WSP',
                status: { [Op.not]: null }
            },
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('activity_type')), 'activity_type']]
        });

        const answeredCount = answeredSchedulesRows.length;
        console.log(`[WSP SUBMIT] session:${session.id} answeredCount:${answeredCount} totalCount:${totalCount}`);
        
        // DEBUG: Log what was found
        const found = answeredSchedulesRows.map(r => r.activity_type || r.DATA_VALUES?.activity_type);
        console.log(`[WSP SUBMIT] Found schedules:`, found);

        if (answeredCount < totalCount) {
            return res.status(400).json({
                error: `Submission blocked: Only ${answeredCount}/${totalCount} schedules addressed on server. Please ensure all schedules are completed.`,
                totalCount,
                answeredCount
            });
        }

        // New behavior: Submission allowed even with unresolved defects.
        // We just need to trigger the status update.
        await SessionStatusService.updateStatus(session.id, 'WSP', 'SUBMITTED');
        res.json({ success: true, message: 'WSP Inspection submitted and locked' });
    } catch (err) {
        console.error('Wsp Submit Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
};
