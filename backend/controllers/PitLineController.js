const { PitLineTrain, PitLineCoach, PitLineSession, InspectionAnswer, Question, AmenitySubcategory, sequelize } = require('../models');
const { Op } = require('sequelize');

// GET /api/pitline/trains - Enhanced with progress
exports.getTrains = async (req, res) => {
    try {
        const trains = await PitLineTrain.findAll({
            order: [['createdAt', 'DESC']]
        });
        
        // Enhance with total progress
        const enhancedTrains = await Promise.all(trains.map(async (t) => {
            const coaches = await PitLineCoach.findAll({ where: { train_id: t.id } });
            const coachIds = coaches.map(c => c.id);
            
            // Total questions per coach (Simplified for efficiency)
            const subcatIds = [119, 120, 175, 176, 177, 178, 179, 186];
            let totalQPerCoach = await Question.count({ 
                where: { 
                    [Op.or]: [
                        { subcategory_id: { [Op.in]: subcatIds } },
                        { category: 'Undergear' }
                    ],
                    is_active: 1 
                } 
            });

            const totalNeeded = coaches.length * totalQPerCoach;
            
            const sessions = await PitLineSession.findAll({
                where: { train_id: t.id, status: { [Op.in]: ['IN_PROGRESS', 'SUBMITTED'] } }
            });
            const sessionIds = sessions.map(s => String(s.id));
            
            const answeredCount = sessionIds.length > 0 ? await InspectionAnswer.count({
                where: { 
                    [Op.or]: [
                        { session_id: { [Op.in]: sessionIds } },
                        { submission_id: { [Op.in]: sessionIds } }
                    ]
                }
            }) : 0;

            return {
                ...t.toJSON(),
                answeredCount: answeredCount,
                totalCount: totalNeeded,
                completion: totalNeeded > 0 ? Math.min(100, Math.round((answeredCount / totalNeeded) * 100)) : 0
            };
        }));

        res.json(enhancedTrains);
    } catch (err) {
        console.error('getTrains Critical Error:', err.message);
        res.status(500).json({ error: `Failed to fetch trains: ${err.message}` });
    }
};

// POST /api/pitline/trains/add
exports.createTrain = async (req, res) => {
    try {
        const { train_number } = req.body;
        if (!train_number) return res.status(400).json({ error: 'Train number is required' });

        const train = await PitLineTrain.create({ train_number });

        // Default coaches: coach_name = label (B1/GEN1 etc.), coach_number = 6-digit unique ID
        const defaults = [
            { name: 'EOG1' }, { name: 'GEN1' }, { name: 'GEN2' }, { name: 'GEN3' }, { name: 'GEN4' },
            { name: 'S1' }, { name: 'S2' }, { name: 'S3' }, { name: 'S4' }, { name: 'S5' },
            { name: 'S6' }, { name: 'B1' }, { name: 'B2' }, { name: 'B3' }, { name: 'B4' },
            { name: 'B5' }, { name: 'B6' }, { name: 'A1' }, { name: 'A2' }, { name: 'H1' },
            { name: 'PANTRY' }, { name: 'EOG2' },
        ];

        // Assign unique 6-digit numbers starting from a base built on timestamp
        const base = 200000 + (train.id * 100);
        const coaches = defaults.map((d, index) => ({
            train_id: train.id,
            coach_name: d.name,
            coach_number: String(base + index + 1),
            position: index + 1,
        }));

        await PitLineCoach.bulkCreate(coaches);

        res.json(train);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Train number already exists' });
        }
        console.error('createTrain Error:', err);
        res.status(500).json({ error: 'Failed to create train' });
    }
};

// DELETE /api/pitline/trains/:id
exports.deleteTrain = async (req, res) => {
    try {
        const { id } = req.params;
        const { InspectionAnswer } = require('../models');

        // Validation: Verify no inspections exist
        const count = await InspectionAnswer.count({ where: { train_id: id } });
        if (count > 0) {
            return res.status(400).json({ error: 'Cannot delete because inspections exist for this record.' });
        }

        await PitLineTrain.destroy({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        console.error('deleteTrain Error:', err);
        res.status(500).json({ error: 'Failed to delete train' });
    }
};

// GET /api/pitline/coaches?train_id=XX
exports.getCoaches = async (req, res) => {
    try {
        const { train_id } = req.query;
        if (!train_id) return res.status(400).json({ error: 'train_id is required' });

        const coaches = await PitLineCoach.findAll({
            where: { train_id },
            order: [['position', 'ASC']]
        });
        res.json(coaches);
    } catch (err) {
        console.error('getCoaches Critical Error:', err.message);
        console.error(err.stack);
        res.status(500).json({ error: `Failed to fetch coaches: ${err.message}` });
    }
},

// POST /api/pitline/coaches/add
exports.addCoach = async (req, res) => {
    try {
        const { train_id, coach_number, coach_name, position } = req.body;
        if (!train_id || !coach_number) return res.status(400).json({ error: 'train_id and coach_number are required' });

        // Enforce exactly 6 numeric digits for coach_number
        if (!/^[0-9]{6}$/.test(coach_number)) {
            return res.status(400).json({ error: 'Coach number must be exactly 6 digits (e.g. 123456).' });
        }

        const count = await PitLineCoach.count({ where: { train_id } });
        if (count >= 24) {
            return res.status(400).json({ error: 'Maximum 24 coaches allowed' });
        }

        const coach = await PitLineCoach.create({
            train_id,
            coach_number,
            coach_name: coach_name || null,
            position: position || (count + 1)
        });
        res.json(coach);
    } catch (err) {
        console.error('addCoach Error:', err);
        res.status(500).json({ error: 'Failed to add coach' });
    }
};

// DELETE /api/pitline/coaches/:id
exports.deleteCoach = async (req, res) => {
    try {
        const { id } = req.params;
        const { InspectionAnswer } = require('../models');

        // Validation: Verify no inspections exist
        const count = await InspectionAnswer.count({ where: { coach_id: id } });
        if (count > 0) {
            return res.status(400).json({ error: 'Cannot delete because inspections exist for this record.' });
        }

        await PitLineCoach.destroy({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        console.error('deleteCoach Error:', err);
        res.status(500).json({ error: 'Failed to delete coach' });
    }
};

// PUT /api/pitline/coaches/:id  — update coach_number (and optional position)
exports.updateCoach = async (req, res) => {
    try {
        const { id } = req.params;
        const { coach_number } = req.body;

        // Validate strictly 6 digits
        if (!coach_number || !/^[0-9]{6}$/.test(coach_number)) {
            return res.status(400).json({ error: 'Coach number must be exactly 6 digits (e.g. 123456).' });
        }

        const coach = await PitLineCoach.findByPk(id);
        if (!coach) return res.status(404).json({ error: 'Coach not found' });

        // Check for duplicate within the same train
        const duplicate = await PitLineCoach.findOne({
            where: { train_id: coach.train_id, coach_number }
        });
        if (duplicate && duplicate.id !== parseInt(id)) {
            return res.status(400).json({ error: 'Coach number already exists in this train.' });
        }

        await coach.update({ coach_number });
        res.json(coach);
    } catch (err) {
        console.error('updateCoach Error:', err);
        res.status(500).json({ error: 'Failed to update coach' });
    }
};



// POST /api/pitline/session/start
exports.startSession = async (req, res) => {
    try {
        const { train_id, coach_id, inspector_id } = req.body;

        if (!train_id || !coach_id) {
            return res.status(400).json({ error: 'train_id and coach_id are required' });
        }

        // Find coach
        const coach = await PitLineCoach.findByPk(coach_id);

        if (!coach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        // Validate Train Context
        if (coach.train_id !== train_id) {
            return res.status(400).json({ error: 'Coach does not belong to this train' });
        }

        const { Op } = require('sequelize');
        const inspectionDate = req.body.inspection_date || new Date().toISOString().split('T')[0];

        // Find latest active or submitted session for this coach on this day
        let session = await PitLineSession.findOne({
            where: { 
                train_id, 
                coach_id, 
                inspection_date: inspectionDate,
                status: { [Op.in]: ['IN_PROGRESS', 'SUBMITTED'] } 
            },
            order: [['createdAt', 'DESC']]
        });

        console.log(`[PITLINE] Session lookup for coach_id:${coach_id} date:${inspectionDate} found:`, session ? `SES-${session.id} (${session.status})` : 'None');

        if (!session) {
            session = await PitLineSession.create({
                train_id,
                coach_id,
                inspection_date: inspectionDate,
                inspector_id: inspector_id || req.user.id,
                status: 'IN_PROGRESS'
            });
            console.log("[PITLINE] New session created:", session.id);
        } else {
            console.log(`[PITLINE] Resuming session: ${session.id} (status: ${session.status})`);
        }

        res.json({ success: true, session_id: session.id, status: session.status });
    } catch (err) {
        console.error('startSession Error:', err);
        res.status(500).json({ error: 'Failed to start pitline session' });
    }
};

/**
 * GET /api/pitline/train/:id/progress
 * Bulk fetch progress for all coaches in a train
 */
exports.getTrainProgress = async (req, res) => {
    try {
        const { id } = req.params; // train_id
        if (!id) return res.status(400).json({ error: 'train_id is required' });

        const coaches = await PitLineCoach.findAll({ 
            where: { train_id: id },
            order: [['position', 'ASC']]
        });
        
        // 1. Calculate denominator: Total Questions
        // Optimized: Get active question counts per subcategory in one go
        const qStats = await Question.findAll({
            attributes: ['subcategory_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            where: { is_active: 1, subcategory_id: { [Op.ne]: null } },
            group: ['subcategory_id']
        });

        // Special handling for Undergear category as per legacy logic
        const undergearCount = await Question.count({ 
            where: { category: 'Undergear', is_active: 1 } 
        });

        const subcatQCounts = {};
        qStats.forEach(stat => {
            const sid = stat.getDataValue('subcategory_id');
            const count = parseInt(stat.getDataValue('count'));
            subcatQCounts[sid] = count;
        });

        const subcategories = await AmenitySubcategory.findAll({ attributes: ['id', 'name'] });
        let totalQuestionsAcrossSubcats = 0;
        
        for (const sub of subcategories) {
            if (sub.name.toLowerCase().includes('undergear')) {
                totalQuestionsAcrossSubcats += undergearCount;
            } else {
                totalQuestionsAcrossSubcats += (subcatQCounts[sub.id] || 0);
            }
        }

        // 2. Fetch Sessions and Answers in Batch
        const coachIds = coaches.map(c => c.id);
        const sessions = await PitLineSession.findAll({
            where: { 
                train_id: id, 
                coach_id: { [Op.in]: coachIds }, 
                status: { [Op.in]: ['IN_PROGRESS', 'SUBMITTED'] } 
            },
            order: [['createdAt', 'DESC']]
        });

        // Map latest session per coach
        const latestSessions = {};
        sessions.forEach(s => {
            if (!latestSessions[s.coach_id]) {
                latestSessions[s.coach_id] = s;
            }
        });

        const sessionIds = Object.values(latestSessions).map(s => String(s.id));
        const allAnswers = sessionIds.length > 0 ? await InspectionAnswer.findAll({
            where: {
                [Op.or]: [
                    { submission_id: { [Op.in]: sessionIds } },
                    { session_id: { [Op.in]: sessionIds } }
                ]
            },
            attributes: ['session_id', 'submission_id', 'status']
        }) : [];

        // Group answers by session
        const answersBySession = {};
        allAnswers.forEach(a => {
            const sid = sessionIds.find(id => String(id) === String(a.submission_id) || String(id) === String(a.session_id));
            if (sid) {
                if (!answersBySession[sid]) answersBySession[sid] = [];
                answersBySession[sid].push(a);
            }
        });

        // 3. Assemble Progress Map
        const progressMap = {};
        for (const coach of coaches) {
            const session = latestSessions[coach.id];

            if (!session) {
                progressMap[coach.id] = { 
                    coach_id: coach.id,
                    answered: 0,
                    total: totalQuestionsAcrossSubcats,
                    completion: 0, 
                    defectCount: 0, 
                    status: 'NOT_STARTED' 
                };
                continue;
            }

            const answers = answersBySession[session.id] || [];
            const answeredCount = answers.length;
            const defectCount = answers.filter(a => a.status === 'DEFICIENCY').length;
            
            const completion = totalQuestionsAcrossSubcats > 0 
                ? Math.min(100, Math.round((answeredCount / totalQuestionsAcrossSubcats) * 100)) 
                : 0;

            progressMap[coach.id] = {
                coach_id: coach.id,
                answered: answeredCount,
                total: totalQuestionsAcrossSubcats,
                answeredCount,        // New standard
                totalCount: totalQuestionsAcrossSubcats, // New standard
                completion,
                defectCount,
                status: session.status,
                session_id: session.id
            };
        }

        res.json(progressMap);
    } catch (err) {
        console.error('getTrainProgress Critical Error:', err.message);
        console.error(err.stack);
        res.status(500).json({ error: `Failed to fetch train progress: ${err.message}` });
    }
};

// POST /api/pitline/session/submit
exports.submitSession = async (req, res) => {
    try {
        const { session_id } = req.body;
        if (!session_id) return res.status(400).json({ error: 'session_id is required' });

        const session = await PitLineSession.findByPk(session_id);
        if (!session) return res.status(404).json({ error: 'Pitline Session not found' });

        const SessionStatusService = require('../services/SessionStatusService');
        await SessionStatusService.updateStatus(session.id, 'PITLINE', 'SUBMITTED');

        // Optional: Trigger projection sync
        const ReportingProjectionService = require('../services/ReportingProjectionService');
        setImmediate(() => {
            ReportingProjectionService.projectSession(session.id, 'PITLINE')
                .catch(err => console.error(`[PITLINE PROJECTION ERROR] session:${session.id}`, err));
        });

        res.json({ success: true, message: 'Coach Inspection Completed Successfully' });
    } catch (err) {
        console.error('Pitline Submit Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
};

/**
 * GET /api/pitline/session/wsp-status?session_id=XX
 * Checks if WSP part of the pitline inspection is complete
 */
exports.getWspStatus = async (req, res) => {
    try {
        const { session_id } = req.query;
        if (!session_id) return res.status(400).json({ error: 'session_id is required' });

        const { Category, LtrSchedule, InspectionAnswer, sequelize } = require('../models');

        // 1. Get total WSP schedules (distinct by name)
        const totalWspSchedules = await LtrSchedule.count({
            where: { is_active: true },
            distinct: true,
            col: 'name'
        });

        if (totalWspSchedules === 0) {
            return res.json({ completed: false, completedCount: 0, totalCount: 0 }); // Better fallback
        }

        // 2. Count distinct schedules answered for THIS session/coach
        // Use activity_type as it's the most reliable source for schedule names in WSP
        const answeredRows = await InspectionAnswer.findAll({
            where: {
                [Op.or]: [
                    { session_id: session_id },
                    { 
                        // Cross-lookup if needed via coach_id from session
                        coach_id: (await PitLineSession.findByPk(session_id))?.coach_id || -1 
                    }
                ],
                module_type: 'WSP'
            },
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('activity_type')), 'activity_type']]
        });

        const completedCount = answeredRows.length;

        res.json({
            completed: completedCount >= totalWspSchedules,
            completedCount,
            totalCount: totalWspSchedules
        });
    } catch (err) {
        console.error('[PITLINE-WSP-STATUS] Error:', err);
        res.status(500).json({ error: 'Failed to fetch WSP status' });
    }
};
