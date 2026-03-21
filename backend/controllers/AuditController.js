const {
    Train, Coach, Category, Activity, Question, InspectionAnswer, LtrSchedule, LtrItem, AmenitySubcategory, AmenityItem, Role, User, CategoryMaster,
    SickLineSession, SickLineAnswer, sequelize
} = require('../models');
const { Op } = require('sequelize');

/**
 * AuditController - Upgraded for Enterprise RBAC
 * Implements Category-First flow and User Audit Trail
 */

// GET /user-categories (Dashboard)
exports.getUserCategories = async (req, res) => {
    try {
        console.log(`[DEBUG] Fetching categories for User ID: ${req.user?.id}`);
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Role }, { model: CategoryMaster, through: { attributes: [] } }]
        });

        if (!user) {
            console.error(`[DEBUG] User not found for ID: ${req.user?.id}`);
            return res.status(404).json({ error: 'User not found' });
        }

        let categories = user.CategoryMasters || [];

        // Admin Fallback: If admin has no categories, show all master categories
        if (user.Role?.role_name === 'Admin' && categories.length === 0) {
            console.log('[DEBUG] Admin has no assigned categories. Returning all masters.');
            categories = await CategoryMaster.findAll();
        }

        console.log(`[DEBUG] Total Categories for response: ${categories.length}`);
        res.json(categories);
    } catch (err) {
        console.error('Dash Error:', err);
        res.status(500).json({ error: 'Failed to fetch assigned categories' });
    }
};

// GET /train-list?category_name=X
exports.getTrains = async (req, res) => {
    try {
        const { category_name } = req.query;
        // Logic: Return trains that have at least one coach with this category
        const trains = await Train.findAll({
            include: [{
                model: Coach,
                required: true,
                include: [{
                    model: Category,
                    where: category_name ? { name: category_name } : {},
                    required: true
                }]
            }],
            order: [['name', 'ASC']]
        });
        res.json(trains);
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Internal server failure' });
    }
};

// GET /coach-list?train_id=X&category_name=Y
exports.getCoaches = async (req, res) => {
    try {
        const { train_id, category_name } = req.query;
        // train_id is now optional to support coach-centric selection (WSP, Commissionary, etc.)

        const where = {};
        if (train_id && train_id !== 'undefined') where.train_id = train_id;

        const moduleMap = {
            'WSP Examination': 'WSP',
            'Coach Commissionary': 'COMMISSIONARY',
            'Sick Line Examination': 'SICKLINE',
            'Pit Line': 'PITLINE'
        };

        const targetModule = moduleMap[category_name];

        const findOptions = {
            where,
            include: [{
                model: Category,
                required: false
            }]
        };

        if (category_name) {
            if (category_name === 'WSP Examination') {
                // WSP shows all coaches traditionally, but we'll prioritize WSP module_type or any coach if needed
                // For now, keep it broad as requested per legacy
                where[Op.or] = [
                    { module_type: 'WSP' },
                    { '$Categories.name$': 'WSP Examination' },
                    { module_type: null } // Broad legacy fallback
                ];
            } else if (targetModule) {
                where[Op.or] = [
                    { module_type: targetModule },
                    { '$Categories.name$': category_name }
                ];
            } else {
                // Unknown category, filter by category join only
                findOptions.include[0].where = { name: category_name };
                findOptions.include[0].required = true;
            }
        }

        const coaches = await Coach.findAll(findOptions);
        res.json(coaches);
    } catch (err) {
        console.error('getCoaches Error:', err);
        res.status(500).json({ error: 'Failed to retrieve coaches' });
    }
};

/**
 * Combined Summary API - Requirement 4
 * GET /api/summary?schedule_id=XX&area=Lavatory
 */
exports.getCombinedSummary = async (req, res) => {
    try {
        const { schedule_id, area } = req.query;
        if (!schedule_id || !area) {
            return res.status(400).json({ error: 'schedule_id and area are required' });
        }

        // Query answers for this schedule and area (using LIKE for logical tagging)
        const answers = await InspectionAnswer.findAll({
            where: {
                schedule_id: schedule_id,
                subcategory_name: {
                    [Op.like]: `${area}%`
                }
            },
            attributes: ['subcategory_name', 'activity_type']
        });

        const compartments = area.toLowerCase().includes('lavatory')
            ? ['L1', 'L2', 'L3', 'L4']
            : ['D1', 'D2', 'D3', 'D4'];

        const summary = {};
        compartments.forEach(comp => {
            summary[comp] = { Major: 0, Minor: 0 };
        });

        const totals = { Major: 0, Minor: 0 };

        answers.forEach(ans => {
            // Extract compartment from "Area Name [CX]"
            const match = ans.subcategory_name.match(/\[(.*?)\]/);
            const comp = match ? match[1] : null;

            if (comp && summary[comp]) {
                const type = ans.activity_type; // 'Major' or 'Minor'
                if (summary[comp].hasOwnProperty(type)) {
                    summary[comp][type]++;
                    totals[type]++;
                }
            }
        });

        res.json({
            ...summary,
            total: totals
        });

    } catch (error) {
        console.error('Summary Error:', error);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
};

// GET /activity-types?category_name=X&coach_id=Y&subcategory_id=Z
exports.getActivities = async (req, res) => {
    try {
        const { category_name, coach_id, subcategory_id } = req.query;

        let where = {};
        if (subcategory_id) {
            // Rule #12: Fetch via subcategory_id ONLY
            where = { subcategory_id };
        } else {
            if (!category_name || !coach_id) return res.status(400).json({ error: 'Missing parameters' });
            const category = await Category.findOne({
                where: { name: category_name, coach_id }
            });
            if (!category) return res.status(404).json({ error: 'Category not found for this coach' });
            where.category_id = category.id;
        }

        const activities = await Activity.findAll({ where });
        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
};

// GET /amenity-subcategories?category_name=Amenity&coach_id=Y
exports.getAmenitySubcategories = async (req, res) => {
    try {
        const { category_name, coach_id, category_id } = req.query;
        // Strict: We only need category identifier to find Master. Coach ID is irrelevant for Amenity Master.

        let category;
        if (category_id) {
            category = await CategoryMaster.findByPk(category_id);
        } else if (category_name) {
            category = await CategoryMaster.findOne({ where: { name: category_name } });
        } else {
            return res.status(400).json({ error: 'category_id or category_name required' });
        }

        if (!category) return res.status(404).json({ error: 'Amenity Category Master not found' });

        const subs = await AmenitySubcategory.findAll({ where: { category_id: category.id } });
        res.json(subs);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
};

// GET /checklist?activity_id=X&schedule_id=Y&subcategory_id=Z
exports.getQuestions = async (req, res) => {
    try {
        const { schedule_id, subcategory_id, framework, activity_type, activity_id } = req.query;

        const categoryNameInput = req.query.categoryName || req.query.category_name || '';

        console.log('[CHECKLIST PARAMS]', {
            categoryName: categoryNameInput,
            framework,
            subcategory_id,
            activity_type
        });

        if (categoryNameInput?.toLowerCase() === 'undergear') {
            console.log('[UNDERGEAR BYPASS ACTIVE]');

            const questions = await Question.findAll({
                where: {
                    category: 'Undergear',
                    is_active: 1
                },
                order: [['id', 'ASC']]
            });

            console.log('[UNDERGEAR FETCH COUNT]', questions.length);

            return res.json({
                success: true,
                questions
            });
        }

        let where = {};
        let categoryName = '';

        // CASE A: Pit Line / Amenity / Commissionary / SickLine / CAI (Subcategory + Framework)
        if (subcategory_id && framework && ['AMENITY', 'COMMISSIONARY', 'WSP', 'PITLINE', 'SICKLINE', 'CAI'].includes(framework)) {
            where.subcategory_id = subcategory_id;
            categoryName = (framework === 'AMENITY') ? 'Amenity' :
                (framework === 'COMMISSIONARY') ? 'Coach Commissioning' :
                    (framework === 'WSP') ? 'WSP Examination' :
                        (framework === 'PITLINE') ? 'Pit Line Examination' :
                            (framework === 'SICKLINE') ? 'Sick Line Examination' :
                                (framework === 'CAI') ? 'CAI / Modifications' : 'Standard';

            console.log('[GROUPING CATEGORY]', categoryName);

            // Safety: Do NOT allow mixing schedule_id with subcategory-based frameworks
            if (schedule_id) {
                return res.status(400).json({ error: 'Ambiguous framework parameters: Cannot mix schedule_id with subcategory_id' });
            }
        }
        // CASE B: WSP Specific (Schedule + Framework)
        else if (schedule_id && framework === 'WSP') {
            where.schedule_id = schedule_id;
            categoryName = 'WSP Examination';
        }
        else {
            console.error('[CHECKLIST ERROR] Contract violation:', {
                schedule_id,
                subcategory_id,
                framework,
                activity_type
            });
            return res.status(400).json({
                error: 'Ambiguous framework parameters',
                details: 'Backend requires (subcategory_id + framework) OR (schedule_id + framework=WSP)'
            });
        }

        // RBAC Check
        const userCategories = await CategoryMaster.findAll({
            include: [{
                model: User,
                where: { id: req.user.id }
            }]
        });

        const userCategoryNames = (userCategories || []).map(c => (c.name || '').toLowerCase());
        
        // Flexible matching for production safety
        const hasAccess = req.user.role === 'Admin' ||
            userCategoryNames.some(name => 
                name.includes(categoryName.toLowerCase()) || 
                categoryName.toLowerCase().includes(name) ||
                (categoryName === 'Pit Line Examination' && name.includes('pit line')) ||
                (categoryName === 'WSP Examination' && name.includes('wsp'))
            );

        if (!hasAccess) {
            console.error('[ACCESS DENIED] User Categories:', userCategoryNames, 'Requested Category:', categoryName);
            return res.status(403).json({ 
                error: 'Access denied: Category not assigned to your profile',
                details: `Requested: ${categoryName}, Assigned: ${userCategoryNames.join(', ')}` 
            });
        }

        if (categoryName === 'Amenity' || categoryName === 'Coach Commissioning' || categoryName === 'Coach Commissionary') {
            console.log('[GROUPING ACTIVATED]', categoryName);
            // Step 1: Fetch ALL items (ignoring activity_type for now)
            const allItems = await AmenityItem.findAll({
                where: { subcategory_id },
                include: [{
                    model: Question,
                    required: true,
                    where: { subcategory_id, is_active: 1 }
                }]
            });

            // Step 2: Detect if any item HAS an activity_type
            const supportsActivityType = allItems.some(item => item.activity_type !== null);

            // Step 3: Filter logic
            let filteredItems = allItems;
            if (supportsActivityType) {
                let type = req.query.activity_type;
                if (!type && activity_id) {
                    const act = await Activity.findByPk(activity_id);
                    type = act ? act.type : 'Minor';
                }
                if (!type) type = 'Major'; // Default for PitLine or other generic fetches
                filteredItems = allItems.filter(item => item.activity_type === type);
            }

            const grouped = filteredItems.map(item => ({
                item_name: item.name,
                questions: item.Questions
            }));

            return res.json({
                supportsActivityType,
                groupedQuestions: grouped
            });
        }

        const questions = await Question.findAll({ 
            where: { 
                ...where,
                is_active: 1
            } 
        });
        res.json(questions);
    } catch (err) {
        console.error('[CHECKLIST CRITICAL ERROR]', err.message);
        console.error(err.stack);
        res.status(500).json({ error: `Internal failure: ${err.message}` });
    }
};

// POST /save-inspection
exports.submitInspection = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { train_id, coach_id, activity_id, schedule_id, subcategory_id, compartment, answers, submission_id, mode, submission_timestamp } = req.body;
        console.log(`[SUBMIT] Attempting: ${submission_id} (Train: ${train_id}, Coach: ${coach_id}, Act: ${activity_id}, Sch: ${schedule_id}, Sub: ${subcategory_id})`);

        // Phase 1: Submission Integrity/Race Condition Protection
        if (submission_timestamp) {
            const latestAnswer = await InspectionAnswer.findOne({
                where: {
                    train_id,
                    coach_id,
                    [Op.or]: [
                        { schedule_id: schedule_id || null },
                        { subcategory_id: subcategory_id || null }
                    ]
                },
                order: [['updatedAt', 'DESC']],
                transaction
            });

            if (latestAnswer && new Date(latestAnswer.updatedAt) > new Date(submission_timestamp)) {
                await transaction.rollback();
                console.error(`[SUBMIT REJECTED] Race condition: Latest answer updatedAt (${latestAnswer.updatedAt}) > submissionTimestamp (${submission_timestamp})`);
                return res.status(400).json({ 
                    error: 'Submission blocked: Some answers were saved after you hit submit. Please review and try again.',
                    retry_recommended: true 
                });
            }
        }

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Invalid submission format' });
        }

        const userId = req.user.id;
        const roleName = req.user.role;

        // 1. Fetch Master Data & Snapshots
        const [train, coach, activity, schedule, subcategory, currentUser] = await Promise.all([
            Train.findByPk(train_id),
            Coach.findByPk(coach_id),
            activity_id ? Activity.findByPk(activity_id, { include: [Category] }) : Promise.resolve(null),
            schedule_id ? LtrSchedule.findByPk(schedule_id) : Promise.resolve(null),
            subcategory_id ? AmenitySubcategory.findByPk(subcategory_id) : Promise.resolve(null),
            User.findByPk(req.user.id, { include: [Role] })
        ]);

        if (!train || !coach || !currentUser) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Context not found' });
        }

        // 1.5 Fetch Questions to get Item Names (for Amenity snapshots)
        // Filter out invalid entries (must have either answer or observed_value)
        const validAnswers = answers.filter(a =>
            (a.status === 'OK' || a.status === 'DEFICIENCY' || a.status === 'NA') ||
            (a.observed_value && a.observed_value.trim().length > 0)
        );

        if (validAnswers.length === 0) {
            return res.status(400).json({ error: 'No valid answers to submit.' });
        }

        // Submission Integrity Check: Ensure all questions are addressed
        let totalExpected = 0;
        const currentCategory = activity?.Category?.name || (subcategory ? 'Amenity' : '');
        
        if (subcategory_id && ['Amenity', 'Coach Commissioning', 'Coach Commissionary'].includes(currentCategory)) {
            // Complex grouping logic for Amenity/Commissionary
            const allItems = await AmenityItem.findAll({
                where: { subcategory_id },
                include: [{ model: Question, required: true, where: { subcategory_id, is_active: true } }]
            });
            const supportsActivityType = allItems.some(item => item.activity_type !== null);
            let filteredItems = allItems;
            if (supportsActivityType) {
                const type = activity?.type || 'Major';
                filteredItems = allItems.filter(item => item.activity_type === type);
            }
            totalExpected = filteredItems.reduce((acc, item) => acc + (item.Questions?.length || 0), 0);
        } else if (subcategory_id) {
            // Standard subcategory-based (PitLine)
            totalExpected = await Question.count({ where: { subcategory_id, is_active: true } });
        } else if (schedule_id) {
            // Schedule-based (WSP)
            totalExpected = await Question.count({ where: { schedule_id, is_active: true } });
        }

        if (totalExpected > 0 && validAnswers.length < totalExpected) {
            console.error(`[SUBMIT ERROR] Integrity Violation: ${validAnswers.length}/${totalExpected} questions answered for Category: ${currentCategory}`);
            return res.status(400).json({
                error: `Submission blocked: Only ${validAnswers.length}/${totalExpected} questions addressed. Please ensure all items are completed.`,
                missingCount: totalExpected - validAnswers.length
            });
        }

        const questionIds = validAnswers.map(a => a.question_id);
        const questionsList = await Question.findAll({
            where: { id: questionIds },
            include: [
                { model: AmenityItem, required: false },
                { model: LtrItem, required: false } // Include LTR Item
            ]
        });

        // 2. Prepare Payload with Audit Trail
        const records = validAnswers.map(ans => {
            const questionData = questionsList.find(q => q.id === ans.question_id);
            if (!questionData) throw new Error(`Question ID ${ans.question_id} not found`);

            // Dynamic Validation Rule
            if (questionData.answer_type === 'VALUE') {
                if (!ans.observed_value) throw new Error(`Measurement value required for: "${questionData.text}"`);
                // For VALUE types, we assume OK unless specified otherwise, but standard audit uses BOOLEAN statuses
                ans.status = ans.status || 'OK';
            } else {
                // Default STATUS-based
                if (!ans.status) throw new Error(`Status (OK/DEFICIENCY/NA) required for: "${questionData.text}"`);
            }

            // Phase: Evaluate Completeness for Locking
            let isComplete = false;
            if (ans.status === 'DEFICIENCY') {
                const hasReasons = Array.isArray(ans.reasons) && ans.reasons.length > 0;
                const hasRemark = !!ans.remarks;
                const hasPhoto = !!(ans.image_path || ans.photo_url);
                if (hasReasons && hasRemark && hasPhoto) {
                    isComplete = true;
                }
            }

            return {
                status: ans.status,
                observed_value: ans.observed_value,
                reasons: ans.reasons,
                remarks: ans.remarks,
                photo_url: ans.image_path || ans.photo_url,

                // Foreign Keys
                train_id,
                coach_id,
                activity_id,
                schedule_id,
                subcategory_id,
                question_id: ans.question_id,
                user_id: userId,

                // Snapshots
                submission_id: submission_id || `LEGACY-${Date.now()}`,
                train_number: train.train_number,
                coach_number: coach.coach_number,
                category_name: activity?.Category?.name || (subcategory ? 'Amenity' : 'Audit'),
                subcategory_name: subcategory ? (compartment ? `${subcategory.name} [${compartment}]` : subcategory.name) : (questionData?.AmenitySubcategory ? (compartment ? `${questionData.AmenitySubcategory.name} [${compartment}]` : questionData.AmenitySubcategory.name) : null),
                schedule_name: schedule?.name || null,
                item_name: questionData?.AmenityItem?.name || questionData?.LtrItem?.name || null, // Snapshot Item Name (Amenity or LTR)
                question_text_snapshot: questionData?.text || 'Standard Question', // Snapshot text
                activity_type: activity?.type || questionData?.Activity?.type || null,
                inspection_status: 'Completed',
                user_name: currentUser.name,
                role_snapshot: currentUser.Role?.role_name || roleName,
                defect_locked: isComplete ? 1 : 0,
                module_type: subcategory ? 'AMENITY' : 'PITLINE'
            };
        });

        if (mode === 'SICKLINE') {
            const today = new Date().toISOString().split('T')[0];
            let [session] = await SickLineSession.findOrCreate({
                where: { coach_id, inspection_date: today },
                defaults: {
                    coach_number: coach.coach_number,
                    inspection_date: today,
                    created_by: userId,
                    status: 'IN_PROGRESS'
                },
                transaction
            });

            const sickLineRecords = validAnswers.map(ans => {
                const questionData = questionsList.find(q => q.id === ans.question_id);
                
                // locking context
                let isComplete = false;
                if (ans.status === 'DEFICIENCY') {
                    const hasReasons = Array.isArray(ans.reasons) && ans.reasons.length > 0;
                    const hasRemark = !!ans.remarks;
                    const hasPhoto = !!(ans.image_path || ans.photo_url);
                    if (hasReasons && hasRemark && hasPhoto) isComplete = true;
                }

                return {
                    session_id: session.id,
                    subcategory_id: subcategory_id || questionData.subcategory_id,
                    activity_type: activity?.type || 'WSP', // WSP schedules don't have activity_type by default
                    question_id: ans.question_id,
                    compartment_id: compartment || 'NA',
                    status: ans.status,
                    reasons: ans.reasons || [],
                    remarks: ans.remarks || '',
                    photo_url: ans.image_path || ans.photo_url,
                    question_text_snapshot: questionData?.text || 'Standard Question',
                    defect_locked: isComplete ? 1 : 0
                };
            });

            // For SickLine, we typically use upsert-like behavior per answer to avoid duplicates if user re-submits
            for (const rec of sickLineRecords) {
                await SickLineAnswer.upsert(rec, { transaction });
            }
            
            // Update session status to SUBMITTED
            const SessionStatusService = require('../services/SessionStatusService');
            await SessionStatusService.updateStatus(session.id, 'SICKLINE', 'SUBMITTED');

        } else {
            // Standard Flow: Bulk Insert into InspectionAnswer
            await InspectionAnswer.bulkCreate(records, { transaction });

            // For Standard Audit (PitLine/Commissionary), we should also try to update session status if submission_id maps to a session
            // But usually Audit is bulk, and session linking is handled by the projection service.
            // If submission_id is numerical, it might be a session_id.
            if (submission_id && !isNaN(submission_id)) {
                const SessionStatusService = require('../services/SessionStatusService');
                const moduleType = (subcategory || subcategory_id) ? 'COMMISSIONARY' : 'PITLINE';
                try {
                    await SessionStatusService.updateStatus(submission_id, moduleType, 'SUBMITTED');
                } catch(e) {
                    console.log(`[SUBMIT] Could not update session status for ${submission_id}: ${e.message}`);
                }
            }
        }

        await transaction.commit();

        // Phase 26 Integrated: Trigger Reporting Projection for mobile/dash visibility
        const ReportingProjectionService = require('../services/ReportingProjectionService');
        // Determine module type for projection
        let moduleTypeForProjection = 'PITLINE';
        if (currentCategory === 'Amenity') {
            moduleTypeForProjection = 'AMENITY';
        } else if (subcategory || subcategory_id) {
            moduleTypeForProjection = 'COMMISSIONARY';
        }

        // Find or create a session link if submission_id is numerical
        // For standard Audit, reporting_sessions uses source_session_id
        setImmediate(() => {
            ReportingProjectionService.projectSession(submission_id, moduleTypeForProjection)
                .catch(err => console.error(`[AUDIT PROJECTION ERROR] ID:${submission_id}`, err));
        });

        res.status(201).json({
            success: true,
            recordsSaved: records.length,
            audited_by: currentUser.name
        });

    } catch (err) {
        console.error('[SUBMIT] CRITICAL ERROR:', err);
        if (transaction) await transaction.rollback();
        res.status(err.message.includes('Validation') ? 400 : 500).json({ error: err.message });
    }
};
