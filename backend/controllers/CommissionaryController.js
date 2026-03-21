const {
    CommissionarySession,
    CommissionaryAnswer,
    Coach,
    PitLineCoach,
    AmenitySubcategory,
    AmenityItem,
    Question,
    Activity,
    Category,
    CategoryMaster,
    InspectionAnswer,
    sequelize
} = require('../models');
const SessionStatusService = require('../services/SessionStatusService');
const SessionResolutionService = require('../services/SessionResolutionService');
const { Op } = require('sequelize');
const { calculateCompliance } = require('../utils/compliance');



// GET /api/commissionary/seed-reasons (TEMPORARY FIX)
exports.seedReasons = async (req, res) => {
    try {
        const [questions] = await sequelize.query("SELECT id FROM questions WHERE category = 'Undergear'");
        const reasons = [
            'Complete Failure',
            'Structural Damage',
            'Replacement Required',
            'Safety Hazard',
            'Beyond Repair',
            'Non-Functional'
        ];

        let count = 0;
        for (const q of questions) {
            for (const text of reasons) {
                try {
                    await sequelize.query(
                        `INSERT INTO Reasons (question_id, text, created_at, updatedAt) VALUES (?, ?, NOW(), NOW())`,
                        { replacements: [q.id, text] }
                    );
                    count++;
                } catch (e) {
                    if (e.name === 'SequelizeUniqueConstraintError' || e.original?.code === 'ER_DUP_ENTRY') continue;
                    try {
                        await sequelize.query(
                            `INSERT INTO Reasons (question_id, text) VALUES (?, ?)`,
                            { replacements: [q.id, text] }
                        );
                        count++;
                    } catch (e2) { }
                }
            }
        }
        res.json({ message: `Successfully seeded ${count} reasons for Undergear` });
    } catch (err) {
        console.error('Seed Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/commissionary/coaches
exports.listCoaches = async (req, res) => {
    try {
        const coaches = await Coach.findAll({
            where: { module_type: 'COMMISSIONARY' },
            order: [['createdAt', 'DESC']]
        });
        res.json(coaches);
    } catch (err) {
        res.status(500).json({ error: 'Failed to list coaches' });
    }
};

// POST /api/commissionary/coaches
exports.createCoach = async (req, res) => {
    try {
        const { coach_number, coach_type } = req.body;
        if (!coach_number) return res.status(400).json({ error: 'Coach number is required' });

        const existing = await Coach.findOne({ where: { coach_number } });
        if (existing) return res.status(400).json({ error: 'Coach number already exists' });

        const coach = await Coach.create({
            coach_number,
            coach_type,
            module_type: 'COMMISSIONARY',
            created_by: req.user.id,
            train_id: 1 // Default dummy train
        });
        res.json(coach);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create coach' });
    }
};

// DELETE /api/commissionary/coaches/:id
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

// GET /api/commissionary/session?coach_number=X
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
            expected_module: 'COMMISSIONARY'
        });

        if (!coach) return res.status(404).json({ error: 'Coach not found' });

        // Hard Validation: Ensure coach belongs to a valid module
        if (coach.module_type !== 'COMMISSIONARY' && coach.module_type !== 'PITLINE' && coach.module_type !== 'AMENITY') {
            return res.status(400).json({ error: 'Invalid coach module for this session type' });
        }

        const rawModuleType = String(req.query.module_type || '').trim().toUpperCase();
        const moduleType = rawModuleType === 'AMENITY' ? 'AMENITY' : 'COMMISSIONARY';
        const today = new Date().toISOString().split('T')[0];

        let session = await CommissionarySession.findOne({
            where: {
                coach_id: coach.id,
                inspection_date: today,
                module_type: moduleType,
                status: { [Op.in]: ['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED'] }
            },
            order: [['createdAt', 'DESC']]
        });

        console.log(`[SESSION API] { coach_number: ${coach_number}, moduleType: ${moduleType} } Found: ${session?.id || 'None'}`);



        // Only create a new session if none exists OR the existing one is CLOSED
        if (!session || session.status === 'CLOSED') {
            session = await CommissionarySession.create({
                coach_id: coach.id,
                coach_number: coach.coach_number,
                inspection_date: today,
                created_by: req.user.id,
                module_type: moduleType,
                status: 'DRAFT'
            });
            console.log(`[SESSION API] New session created: ${session.id} for ${moduleType}`);

        } else {
        }

        res.json({ success: true, data: session });
    } catch (err) {
        console.error('Session Error:', err);
        res.status(500).json({ success: false, message: 'Failed to manage session' });
    }
};

// GET /api/commissionary/questions?subcategory_id=X&activity_type=Y
exports.getQuestions = async (req, res) => {
    try {
        const { subcategory_id, activity_type, categoryName } = req.query;
        if (req.query.categoryName?.toLowerCase() === 'undergear') {
            const questions = await Question.findAll({
                where: {
                    category: 'Undergear',
                    is_active: 1
                },
                order: [['display_order', 'ASC']]
            });
            return res.json({ questions });
        }

        if (!subcategory_id) return res.status(400).json({ error: 'Missing subcategory_id' });

        console.log('[SUBCATEGORY REQUESTED]', req.query.subcategory_id);
        console.log(`[STABILIZATION-INPUT] subcategory_id: ${subcategory_id}, activity_type: ${activity_type}, categoryName: ${categoryName}`);

        // Phase 1 & 2: Enforce strict item filtering, remove ANY loose filtering
        const includeConfig = {
            model: AmenityItem,
            required: true,
            where: {
                subcategory_id: req.query.subcategory_id
            }
        };

        if (activity_type) {
            includeConfig.where.activity_type = activity_type;
        }

        const questions = await Question.findAll({
            where: { subcategory_id: req.query.subcategory_id },
            include: [includeConfig],
            order: [['display_order', 'ASC'], ['id', 'ASC']]
        });

        let supportsActivityType = false;
        if (questions.some(q => q.AmenityItem && q.AmenityItem.activity_type !== null)) {
            supportsActivityType = true;
        }

        const groupedResults = [{
            item_name: 'Questions',
            questions: questions
        }];

        // Phase 3: Add Diagnostic Log
        console.log('[ISOLATION CHECK]', {
            requestedSubcategory: req.query.subcategory_id,
            returnedItemNames: groupedResults.map(g => g.item_name)
        });

        res.json({
            groups: groupedResults,
            supportsActivityType
        });
    } catch (err) {
        console.error('[STABILIZATION-FATAL] getQuestions Error:', err);
        res.status(500).json({ error: 'Failed' });
    }
};

// GET /api/commissionary/answers
exports.getAnswers = async (req, res) => {
    try {
        const { session_id, compartment_id, subcategory_id, activity_type } = req.query;
        const rawModuleType = String(req.query.module_type || '').trim().toUpperCase();
        const moduleType = rawModuleType === 'AMENITY' ? 'AMENITY' : 'COMMISSIONARY';
        console.log('[ANSWERS API]', { session_id, moduleType });

        const session = await SessionResolutionService.resolveSession(session_id, moduleType);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        const whereClause = { 
            session_id, 
            coach_id: session.coach_id,
            compartment_id, 
            subcategory_id, 
            activity_type,
            module_type: moduleType
        };

        const answers = await CommissionaryAnswer.findAll({
            where: whereClause,
            attributes: [
                'id', 'question_id', 'status', 'reasons', 'remarks', 'photo_url',
                'resolved', 'after_photo_url', 'resolution_remark',
                'compartment_id', 'activity_type', 'subcategory_id', 'session_id', 'coach_id', 'module_type'
            ]
        });

        res.json({ success: true, data: answers });
    } catch (err) {
        console.error('getAnswers Error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch answers' });
    }
};

// POST /api/commissionary/save
exports.saveAnswers = async (req, res) => {
    console.log(`[DEBUG] saveAnswers ENTERED - Question: ${req.body.question_id}, File: ${!!req.file}`);
    try {
        const {
            session_id,
            compartment_id,
            subcategory_id,
            activity_type,
            question_id,
            status,
            remarks,
            module_type
        } = req.body;

        const rawModuleType = String(module_type || '').trim().toUpperCase();
        const moduleType = rawModuleType === 'AMENITY' ? 'AMENITY' : 'COMMISSIONARY';

        if (!session_id || !question_id) {
            console.warn('[DEBUG] saveAnswers - Missing fields:', { session_id, question_id });
            return res.status(400).json({ message: "Missing required session_id or question_id" });
        }

        // Phase 26: Softened Save Validation for progress tracking
        // Deficiency validation will be enforced during submission

        let parsedReasons = [];
        if (req.body.reasons) {
            try {
                parsedReasons = typeof req.body.reasons === 'string'
                    ? JSON.parse(req.body.reasons)
                    : req.body.reasons;
            } catch (pErr) {
                console.error('[DEBUG] Reasons parse fail:', pErr);
                parsedReasons = [];
            }
        }

        let photo_url = null;
        if (req.file) {
            photo_url = `/public/uploads/${req.file.filename}`;
            console.log('[DEBUG] Image saved at:', photo_url);
        } else if (req.body.photo_url) {
            photo_url = req.body.photo_url;
        }

        // Fetch session for coach_id
        const session = await SessionResolutionService.resolveSession(session_id, moduleType);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        // Fetch question text for snapshot (required by schema)
        const qData = await Question.findByPk(question_id);

        const AnswerModel = moduleType === 'AMENITY' ? InspectionAnswer : CommissionaryAnswer;

        let ansRecord = await AnswerModel.findOne({
            where: { 
                session_id, 
                question_id, 
                coach_id: session.coach_id, 
                compartment_id, 
                subcategory_id, 
                activity_type,
                module_type: moduleType
            }
        });
        
        // Fallback: Check CommissionaryAnswer if not found in primary AnswerModel (for legacy)
        if (!ansRecord && moduleType === 'AMENITY') {
            ansRecord = await CommissionaryAnswer.findOne({
                where: { session_id, question_id, coach_id: session.coach_id, compartment_id, subcategory_id, activity_type, module_type: 'AMENITY' }
            });
        }

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

            const AnswerModel = moduleType === 'AMENITY' ? InspectionAnswer : CommissionaryAnswer;
            // Ensure we are updating the correct model if fallback was used
            const recordToUpdate = (ansRecord instanceof InspectionAnswer) ? ansRecord : (moduleType === 'AMENITY' ? ansRecord : ansRecord); 
            // Better: just call update on the instance
            await ansRecord.update({
                status: status || 'OK',
                reasons: parsedReasons,
                remarks: remarks || '',
                photo_url: photo_url || ansRecord.photo_url,
                question_text_snapshot: qData?.text || ansRecord.question_text_snapshot,
                defect_locked: isComplete ? 1 : 0,
                module_type: moduleType
            });
        } else {
            const AnswerModel = moduleType === 'AMENITY' ? InspectionAnswer : CommissionaryAnswer;
            ansRecord = await AnswerModel.create({
                session_id, 
                question_id, 
                coach_id: session.coach_id,
                compartment_id, 
                subcategory_id, 
                activity_type,
                status: status || 'OK',
                reasons: parsedReasons,
                remarks: remarks || '',
                photo_url,
                question_text_snapshot: qData?.text || 'Standard Question',
                defect_locked: isComplete ? 1 : 0,
                module_type: moduleType
            });
        }

        console.log(`[DEBUG] saveAnswers SUCCESS - ID: ${question_id}`);

        // Phase 26: Trigger Reporting Projection (ASYNCHRONOUS via setImmediate)
        const ReportingProjectionService = require('../services/ReportingProjectionService');
        setImmediate(() => {
            ReportingProjectionService.projectSession(session_id, moduleType)
                .catch(err => console.error(`[COMMISSIONARY SAVE PROJECTION ERROR] session:${session_id}`, err));
        });

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("Commissionary Save Error (FATAL):", error);
        // Ensure we ALWAYS return a response even on fatal crash
        if (!res.headersSent) {
            return res.status(500).json({ message: "Internal Server Error", error: error.message });
        }
    }
};

// GET /api/commissionary/progress?coach_number=X
exports.getProgress = async (req, res) => {
    try {
        const { coach_number } = req.query;
        if (!coach_number || coach_number === 'undefined' || coach_number === 'null') {
            return res.status(400).json({ success: false, message: 'Valid Coach number is required' });
        }

        const rawModuleType = String(req.query.module_type || '').trim().toUpperCase();
        const moduleType = rawModuleType === 'AMENITY' ? 'AMENITY' : 'COMMISSIONARY';

        let coach = await Coach.findOne({ where: { coach_number } });
        if (!coach) {
            coach = await PitLineCoach.findOne({ where: { coach_number } });
        }

        if (!coach) return res.status(404).json({ success: false, message: 'Coach not found' });

        const today = new Date().toISOString().split('T')[0];
        const session = await CommissionarySession.findOne({
            where: { coach_id: coach.id, status: { [Op.ne]: 'CLOSED' } },
            order: [['updatedAt', 'DESC']]
        });
        const namePattern = moduleType === 'AMENITY' ? '%Amenity%' : '%Coach Commission%';
        // Phase 26: Resolve subcategories via CategoryMaster for consistency with AuditController
        const masterCategory = await CategoryMaster.findOne({ 
            where: { name: { [Op.like]: namePattern } } 
        });

        let subcategories = [];
        if (masterCategory) {
            subcategories = await AmenitySubcategory.findAll({ 
                where: { category_id: masterCategory.id },
                order: [['id', 'ASC']]
            });
        }

        // Fallback: If no master found, try the old Category table approach (legacy support)
        if (subcategories.length === 0) {
            let categories = await Category.findAll({ 
                where: { coach_id: coach.id, name: { [Op.like]: namePattern } } 
            });
            if (categories.length === 0) {
                categories = await Category.findAll({ 
                    where: { name: { [Op.like]: namePattern } } 
                });
            }
            subcategories = await AmenitySubcategory.findAll({ 
                where: { category_id: categories.map(c => c.id) },
                order: [['id', 'ASC']]
            });
        }
        const totalAreasCount = subcategories.length;

        if (!session) {
            return res.json({
                success: true,
                data: {
                    session_id: null,
                    completed_count: 0,
                    total_expected: totalAreasCount,
                    progress_percentage: 0,
                    status: 'NOT_STARTED',
                    perAreaStatus: subcategories.map(s => ({
                        id: s.id,
                        subcategory_id: s.id,
                        hasMajor: false,
                        hasMinor: false,
                        isComplete: false,
                        completed: false
                    })),
                    answered: 0,
                    total: 0,
                    breakdown: {}
                }
            });
        }

        const AnswerModel = moduleType === 'AMENITY' ? InspectionAnswer : CommissionaryAnswer;

        const progress = await Promise.all(subcategories.map(async (sub) => {
            const allItems = await AmenityItem.findAll({
                where: { subcategory_id: sub.id },
                include: [{ model: Question }]
            });

            const majorIds = allItems.filter(i => i.activity_type === 'Major').flatMap(i => (i.Questions || []).map(q => q.id));
            const minorIds = allItems.filter(i => i.activity_type === 'Minor').flatMap(i => (i.Questions || []).map(q => q.id));
            const allQuestionIds = allItems.flatMap(i => (i.Questions || []).map(q => q.id));

            const realTotal = allQuestionIds.length;

            // Expanded compartment list to support both Coach (A-D) and Amenity (NA, L1-L4, D1-D2)
            const compartments = ['NA', 'A', 'B', 'C', 'D', 'L1', 'L2', 'L3', 'L4', 'D1', 'D2'];
            const compStatus = {};
            await Promise.all(compartments.map(async (compId) => {
                const majorAns = await CommissionaryAnswer.count({
                    distinct: true,
                    col: 'question_id',
                    where: { 
                        session_id: session.id, 
                        question_id: majorIds, 
                        coach_id: session.coach_id,
                        compartment_id: compId,
                        status: { [Op.not]: null },
                        module_type: moduleType
                    }
                });
                const minorAns = await CommissionaryAnswer.count({
                    distinct: true,
                    col: 'question_id',
                    where: { 
                        session_id: session.id, 
                        question_id: minorIds, 
                        coach_id: session.coach_id,
                        compartment_id: compId,
                        status: { [Op.not]: null },
                        module_type: moduleType
                    }
                });

                const pendingDefects = await CommissionaryAnswer.count({
                    distinct: true,
                    col: 'question_id',
                    where: {
                        session_id: session.id,
                        coach_id: session.coach_id,
                        compartment_id: compId,
                        status: 'DEFICIENCY',
                        resolved: { [Op.or]: [false, null] },
                        module_type: moduleType
                    }
                });

                compStatus[compId] = {
                    majorTotal: majorIds.length,
                    majorAnswered: majorAns,
                    minorTotal: minorIds.length,
                    minorAnswered: minorAns,
                    pendingDefects: pendingDefects,
                    isComplete: (majorIds.length === 0 || majorAns === majorIds.length) &&
                        (minorIds.length === 0 || minorAns === minorIds.length) &&
                        (pendingDefects === 0)
                };
            }));

            const isAreaComplete = Object.values(compStatus).every(c => c.isComplete);

            // Fix: Calculate total pending defects for the whole subcategory at once (including NA, L1-L4, etc)
            const totalPendingDefects = await CommissionaryAnswer.count({
                distinct: true,
                col: 'question_id',
                where: {
                    session_id: session.id,
                    coach_id: session.coach_id,
                    subcategory_id: sub.id,
                    status: 'DEFICIENCY',
                    resolved: { [Op.or]: [false, null] },
                    module_type: moduleType
                }
            });

            // Pre-compute totalAnswered once to avoid multiple identical DB queries
            const totalAnswered = await CommissionaryAnswer.count({
                distinct: true,
                col: 'question_id',
                where: { session_id: session.id, coach_id: session.coach_id, subcategory_id: sub.id, status: { [Op.not]: null }, module_type: moduleType }
            });

            const majorAnswered = majorIds.length > 0
                ? await CommissionaryAnswer.count({ distinct: true, col: 'question_id', where: { session_id: session.id, coach_id: session.coach_id, question_id: majorIds, status: { [Op.not]: null }, module_type: moduleType } })
                : 0;
            const minorAnswered = minorIds.length > 0
                ? await CommissionaryAnswer.count({ distinct: true, col: 'question_id', where: { session_id: session.id, coach_id: session.coach_id, question_id: minorIds, status: { [Op.not]: null }, module_type: moduleType } })
                : 0;

            // UNIFIED SIMPLIFIED COMPLETION LOGIC
            // An area is complete if all unique questions have at least one answer in any compartment.
            const isSubcatComplete = realTotal > 0 && totalAnswered >= realTotal && totalPendingDefects === 0;

            return {
                id: sub.id,
                subcategory_id: sub.id,
                subcategory_name: sub.name,
                majorTotal: majorIds.length,
                majorAnswered,
                minorTotal: minorIds.length,
                minorAnswered,
                answered: totalAnswered,
                total: realTotal,
                pendingDefects: totalPendingDefects,
                pending_defects: totalPendingDefects,
                isComplete: isSubcatComplete,
                completed: isSubcatComplete,
                compartmentStatus: compStatus
            };
        }));

        const completedAreasCount = progress.filter(p => p.isComplete).length;
        const percentage = totalAreasCount > 0 ? Math.round((completedAreasCount / totalAreasCount) * 100) : 0;

        const allAnswers = await CommissionaryAnswer.findAll({ where: { session_id: session.id } });
        const overallCompliance = calculateCompliance(allAnswers);

        return res.json({
            success: true,
            status: session.status,
            data: {
                session_id: session.id,
                completed_count: completedAreasCount,
                total_expected: totalAreasCount,
                progress_percentage: percentage,
                overall_compliance: overallCompliance,
                status: session.status,
                perAreaStatus: progress,
                progress: progress, // For compatibility
                answered: progress.reduce((sum, p) => sum + (p.answered || 0), 0),
                total: progress.reduce((sum, p) => sum + (p.total || 0), 0),
                fully_complete: completedAreasCount === totalAreasCount
            }
        });

    } catch (err) {
        console.error('Progress Error:', err);
        return res.status(500).json({ error: 'Failed' });
    }
};

// POST /api/commissionary/complete
exports.completeSession = async (req, res) => {
    try {
        const { session_id, coach_number, module_type } = req.body;
        const moduleType = module_type === 'AMENITY' ? 'AMENITY' : 'COMMISSIONARY';
        let session;

        if (session_id) {
            session = await CommissionarySession.findByPk(session_id);
        } else if (coach_number) {
            const coach = await Coach.findOne({ where: { coach_number } });
            if (!coach) return res.status(404).json({ success: false, message: 'Coach not found' });
            session = await CommissionarySession.findOne({
                where: { coach_id: coach.id, status: { [require('sequelize').Op.ne]: 'CLOSED' } },
                order: [['updatedAt', 'DESC']]
            });
        }

        if (!session) {
            session = await SessionResolutionService.resolveSession(session_id, moduleType);
        }

        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        // Phase 26: Strict Completion Validation
        const answers = await CommissionaryAnswer.findAll({ 
            where: { session_id: session.id, module_type: moduleType } 
        });
        for (const ans of answers) {
            if (ans.status === 'DEFICIENCY') {
                const hasReason = Array.isArray(ans.reasons) && ans.reasons.length > 0;
                const hasRemark = typeof ans.remarks === 'string' && ans.remarks.trim() !== '';
                const hasPhoto = !!ans.photo_url || !!ans.before_photo_url || !!ans.after_photo_url;

                if (!hasReason || !hasRemark || !hasPhoto) {
                    return res.status(400).json({
                        error: `Deficiency for question ID ${ans.question_id} is incomplete. Reason, remark, and photo are required for completion.`
                    });
                }
            }
        }

        await SessionStatusService.updateStatus(session.id, moduleType, 'COMPLETED');

        // Phase 26: Trigger reporting projection on completion
        const ReportingProjectionService = require('../services/ReportingProjectionService');
        setImmediate(() => {
            ReportingProjectionService.projectSession(session.id, moduleType)
                .catch(err => console.error(`[COMPLETION PROJECTION ERROR] ${moduleType}:${session.id}`, err));
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to complete session' });
    }
};

// GET /api/commissionary/combined-report?session_id=X
exports.getCombinedReport = async (req, res) => {
    try {
        const { session_id, module_type } = req.query;
        if (!session_id) return res.status(400).json({ success: false, message: 'session_id is required' });

        const moduleType = module_type === 'AMENITY' ? 'AMENITY' : 'COMMISSIONARY';
        const session = await SessionResolutionService.resolveSession(session_id, moduleType);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        const answers = await CommissionaryAnswer.findAll({
            where: { session_id, module_type: moduleType },
            include: [
                { model: Question, attributes: ['text', 'display_order'] },
                { model: AmenitySubcategory, attributes: ['name'] }
            ],
            order: [
                [AmenitySubcategory, 'id', 'ASC'],
                [Question, 'display_order', 'ASC']
            ]
        });

        // Grouping logic for Matrix
        // matrix: { subcategoryId: { subName, questions: { qId: { qText, cells: { compId: { Major: {ans, rem}, Minor: {ans, rem} } } } } } }
        const matrixData = {};

        answers.forEach(ans => {
            const subId = ans.subcategory_id;
            const qId = ans.question_id;
            const compId = ans.compartment_id;

            if (!matrixData[subId]) {
                matrixData[subId] = {
                    subName: ans.AmenitySubcategory.name,
                    questions: {}
                };
            }

            if (!matrixData[subId].questions[qId]) {
                matrixData[subId].questions[qId] = {
                    qText: ans.Question.text,
                    cells: {}
                };
            }

            if (!matrixData[subId].questions[qId].cells[compId]) {
                matrixData[subId].questions[qId].cells[compId] = { Major: null, Minor: null };
            }

            matrixData[subId].questions[qId].cells[compId][ans.activity_type] = {
                status: ans.status,
                remark: ans.remarks || ans.reason, // Use remarks with compatibility fallback
                hasPhoto: !!ans.photo_url
            };
        });

        // Use central utility for stats
        const overallCompliance = calculateCompliance(answers);

        // Group-wise stats
        const stats = {
            overall: overallCompliance,
            subcategories: {},
            compartments: {}
        };

        const compartmentsList = [...new Set(answers.map(a => a.compartment_id))].filter(Boolean);
        compartmentsList.forEach(c => {
            const compRecords = answers.filter(a => a.compartment_id === c);
            stats.compartments[c] = calculateCompliance(compRecords);
        });

        Object.keys(matrixData).forEach(subId => {
            const subRecords = answers.filter(a => a.subcategory_id == subId);
            stats.subcategories[subId] = calculateCompliance(subRecords);
        });

        res.json({
            success: true,
            data: {
                coach_number: session.coach_number,
                date: session.inspection_date,
                matrix: matrixData,
                stats,
                compartments: compartmentsList
            }
        });
    } catch (err) {
        console.error('Combined Report Error:', err);
        res.status(500).json({ success: false, message: 'Failed to generate combined report' });
    }
};
// POST /api/commissionary/submit
exports.submitSession = async (req, res) => {
    try {
        const { coach_number, submission_timestamp, module_type } = req.body;
        if (!coach_number) return res.status(400).json({ success: false, message: 'coach_number is required' });

        const moduleType = module_type === 'AMENITY' ? 'AMENITY' : 'COMMISSIONARY';


        
        if (submission_timestamp) {
            const today = new Date().toISOString().split('T')[0];
            const coach = await Coach.findOne({ where: { coach_number } });
            if (coach) {
                const session = await CommissionarySession.findOne({ 
                    where: { coach_id: coach.id, inspection_date: today, module_type: type } 
                });
                if (session) {
                    const latestAnswer = await CommissionaryAnswer.findOne({
                        where: { session_id: session.id },
                        order: [['updatedAt', 'DESC']]
                    });

                    if (latestAnswer && new Date(latestAnswer.updatedAt) > new Date(submission_timestamp)) {
                        console.error(`[COMMISSIONARY SUBMIT REJECTED] Race condition for coach ${coach_number}`);
                        return res.status(400).json({ 
                            error: 'Submission blocked: Data modified during submission. Please refresh and try again.',
                            retry_recommended: true 
                        });
                    }
                }
            }
        }

        const today = new Date().toISOString().split('T')[0];
        const coach = await Coach.findOne({ where: { coach_number } });
        if (!coach) return res.status(404).json({ success: false, message: 'Coach not found' });

        const session = await CommissionarySession.findOne({
            where: { coach_id: coach.id, inspection_date: today, module_type: moduleType }
        });

        if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

        // Submission Integrity Check
        // REFINED RECOVERY LOGIC: Use module name pattern and fallback system-wide search
        const namePattern = moduleType === 'AMENITY' ? '%Amenity%' : '%Coach Commission%';
        let categories = await Category.findAll({ 
            where: { coach_id: coach.id, name: { [Op.like]: namePattern } } 
        });

        // Fallback #1: System-wide canonical categories
        if (categories.length === 0) {
            categories = await Category.findAll({ 
                where: { name: { [Op.like]: namePattern } }
            });
        }
        
        let subcategories = await AmenitySubcategory.findAll({ 
            where: { category_id: categories.map(c => c.id) },
            order: [['id', 'ASC']]
        });

        // Fallback #2: If the found categories have no subcategories, search system-wide for categories with this name
        if (subcategories.length === 0) {
            const globalCategories = await Category.findAll({ 
                where: { name: { [Op.like]: namePattern } }
            });
            subcategories = await AmenitySubcategory.findAll({ 
                where: { category_id: globalCategories.map(c => c.id) },
                order: [['id', 'ASC']]
            });
        }
        const totalAreasCount = subcategories.length;
        
        const compartments = ['A', 'B', 'C', 'D'];
        
        // Count total unique questions assigned to these subcategories
        const questions = await Question.findAll({
            where: { subcategory_id: subcategories.map(s => s.id) },
            include: [{ model: AmenityItem, required: true }]
        });
        
        // UNIFIED SIMPLIFIED COMPLETION LOGIC
        // A session is ready for submission if every unique question in its assigned areas has at least one answer.
        const totalUniqueAnswered = await CommissionaryAnswer.count({
            distinct: true,
            col: 'question_id',
            where: { session_id: session.id }
        });

        const totalQuestionsCount = questions.length;

        if (totalUniqueAnswered < totalQuestionsCount) {
            return res.status(400).json({
                success: false,
                message: `Submission blocked: Only ${totalUniqueAnswered}/${totalQuestionsCount} unique questions answered. Please ensure all areas are marked as completed.`,
                missingCount: totalQuestionsCount - totalUniqueAnswered
            });
        }

        // New behavior: Submission allowed even with unresolved defects.
        await SessionStatusService.updateStatus(session.id, moduleType, 'SUBMITTED');
        res.json({ success: true, message: 'Commissionary Inspection submitted and locked' });
    } catch (err) {
        console.error('Commissionary Submit Error:', err);
        res.status(500).json({ success: false, message: 'Failed' });
    }
};
