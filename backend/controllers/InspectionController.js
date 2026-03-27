const {
    InspectionAnswer,
    CommissionaryAnswer,
    SickLineAnswer,
    CaiAnswer,
    Question,
    LtrSchedule,
    AmenitySubcategory,
    AmenityItem,
    PitLineSession,
    WspSession,
    CommissionarySession,
    SickLineSession,
    CaiSession,
    sequelize,
    Op
} = require('../models');
const SessionResolutionService = require('../services/SessionResolutionService');

const BASE_URL = process.env.BASE_URL || 'http://192.168.1.4:8080';

const toAbsoluteUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}/${path.replace(/^\/+/, '')}`;
};


/**
 * Universal API to resolve a defect
 * POST /api/inspection/resolve
 */
exports.resolveDefect = async (req, res) => {
    console.log(`[RESOLVE] Incoming request for answer_id: ${req.body.answer_id || req.body.defect_id}, file: ${req.file ? req.file.filename : 'NO FILE'}`);
    try {
        const answer_id = req.body.answer_id || req.body.defect_id;
        const type = req.body.type || req.body.module_type;
        const resolution_remark = req.body.resolution_remark || req.body.remarks;

        // Construct image path accurately as per User Request
        const imagePath = toAbsoluteUrl(req.file
            ? `uploads/resolutions/${req.file.filename}`
            : req.body.photo_url || null);

        if (!answer_id) {
            return res.status(400).json({ error: 'Missing defect ID' });
        }

        let Model = null, SessionModel = null;
        let activeType = type;
        if (activeType === 'SICKLINE') {
            Model = SickLineAnswer;
        } else if (activeType === 'CAI') {
            Model = CaiAnswer;
        } else if (activeType === 'WSP') {
            Model = InspectionAnswer;
        } else if (activeType === 'COMMISSIONARY') {
            Model = CommissionaryAnswer;
        } else if (activeType === 'PITLINE' || activeType === 'AMENITY') {
            Model = InspectionAnswer;
        } else {
            // Auto-detect model if type is missing or generic
            if (await InspectionAnswer.findByPk(answer_id)) {
                Model = InspectionAnswer;
            } else if (await SickLineAnswer.findByPk(answer_id)) {
                Model = SickLineAnswer;
                activeType = 'SICKLINE';
            } else if (await CaiAnswer.findByPk(answer_id)) {
                Model = CaiAnswer;
                activeType = 'CAI';
            } else if (await CommissionaryAnswer.findByPk(answer_id)) {
                Model = CommissionaryAnswer;
                activeType = 'COMMISSIONARY';
            } else {
                Model = InspectionAnswer;
            }
        }

        const answer = await Model.findByPk(answer_id);
        if (!answer) {
            return res.status(404).json({ error: 'Defect record not found' });
        }

        // --- DATA ISOLATION ---
        if (req.user && req.user.role !== 'SUPER_ADMIN') {
            // For InspectionAnswer, we have direct user_id
            if (activeType === 'PITLINE' || activeType === 'AMENITY' || activeType === 'WSP') {
                if (answer.user_id && answer.user_id !== req.user.id) {
                    return res.status(403).json({ error: 'Unauthorized: You do not own this defect record' });
                }
            } else {
                // For other types, we'd need to check the session, 
                // but as a strict rule if user_id exists in record, check it
                if (answer.user_id && answer.user_id !== req.user.id) {
                    return res.status(403).json({ error: 'Unauthorized: Ownership mismatch' });
                }
                // If no user_id in record, we assume session ownership check was done during retrieval
            }
        }

        const session_id = answer.session_id;
        const transaction = await sequelize.transaction();

        try {
            // Update defect status and persist fields
            if (activeType === 'CAI') {
                await CaiAnswer.update({
                    resolved: 1,
                    resolution_remark: resolution_remark,
                    after_photo_url: imagePath,
                    resolved_at: new Date(),
                    resolved_by: req.user ? req.user.id : null
                }, {
                    where: { id: answer_id },
                    transaction
                });
            } else {
                await Model.update({
                    resolved: 1,
                    resolution_remark: resolution_remark,
                    after_photo_url: imagePath,
                    resolved_at: new Date(),
                    resolved_by: req.user ? req.user.id : null
                }, {
                    where: { id: answer_id },
                    transaction
                });
            }

            // Phase: Automatic Session Closure
            // Check if any unresolved defects remain for this session
            if (session_id && activeType) {
                const session = await SessionResolutionService.resolveSession(session_id, activeType);
                if (session) {
                    const unresolvedCount = await Model.count({
                        where: {
                            session_id,
                            status: 'DEFICIENCY',
                            resolved: 0
                        },
                        transaction
                    });

                    if (unresolvedCount === 0 && session.status === 'SUBMITTED') {
                        console.log(`[CLOSURE] All defects resolved. Closing session: ${session_id}`);
                        await session.update({
                            status: 'CLOSED',
                            closed_at: new Date()
                        }, { transaction });
                    }
                }
            }

            await transaction.commit();
            await answer.reload();

            // Trigger reporting projection so dashboard reflects resolved defect state immediately
            if (session_id && activeType) {
                const ReportingProjectionService = require('../services/ReportingProjectionService');
                setImmediate(() => {
                    ReportingProjectionService.projectSession(session_id, activeType)
                        .catch(err => console.error(`[RESOLVE PROJECTION ERROR] ${activeType}:${session_id}`, err));
                });
            }

            res.json({
                success: true,
                message: 'Defect resolved successfully',
                data: answer
            });
        } catch (innerErr) {
            await transaction.rollback();
            throw innerErr;
        }

    } catch (err) {
        console.error('Resolve Defect Error:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to resolve defect', details: err.message });
    }
};

/**
 * Universal API to get pending defects for a session/subcategory
 * GET /api/inspection/defects
 */
exports.getPendingDefects = async (req, res) => {
    try {
        let { session_id, type, schedule_id, mode, compartment_id, train_id, coach_id } = req.query;
        let subcategory_id = req.query.subcategory_id;
        // NORMALIZATION GUARD: Coerce 0 or missing to NULL to prevent FK violations
        if (!subcategory_id || subcategory_id === 0 || subcategory_id === '0') {
            subcategory_id = null;
        }

        if (!type) {
            // Default to COMMISSIONARY for defects tab
            type = 'COMMISSIONARY';
        }

        // Deterministic Mapping for GENERIC type
        if (type === 'GENERIC') {
            const queryModuleType = req.query.module_type || (where ? where.module_type : null);
            if (queryModuleType === 'COMMISSIONARY') {
                type = 'COMMISSIONARY';
            } else if (queryModuleType === 'WSP') {
                type = 'AMENITY';
            } else if (session_id) {
                const { CommissionarySession } = require('../models');
                const session = await CommissionarySession.findByPk(session_id).catch(() => null);
                if (session && session.coach_module_type === 'COMMISSIONARY') {
                    type = 'COMMISSIONARY';
                }
            }
        }

        if (!session_id && !train_id && !coach_id && type !== 'COMMISSIONARY') {
            return res.status(400).json({ error: 'Missing session_id or type (or train/coach context for PitLine)' });
        }

        let Model;
        // Standardize: ALWAYS filter by status='DEFICIENCY' and resolved=0
        let where = { status: 'DEFICIENCY', resolved: 0 };

        // --- DATA ISOLATION ---
        if (req.user && req.user.role !== 'SUPER_ADMIN') {
            // Only set user_id if the model has the column
            if (Model && Model.rawAttributes && Model.rawAttributes.user_id) {
                where.user_id = req.user.id;
            }
        }

        if (session_id) where.session_id = session_id;
        if (train_id) where.train_id = train_id;
        if (coach_id) where.coach_id = coach_id;

        if (type === 'COMMISSIONARY') {
            Model = CommissionaryAnswer;
            if (subcategory_id) where.subcategory_id = subcategory_id;
            if (compartment_id) where.compartment_id = compartment_id;
        } else if (type === 'SICKLINE') {
            Model = SickLineAnswer;
            if (subcategory_id) where.subcategory_id = subcategory_id;
        } else if (type === 'CAI') {
            Model = CaiAnswer;
        } else if (type === 'WSP') {
            Model = InspectionAnswer;
            const subIdMatch = `WSP-${mode}-${session_id}-%`;
            where.submission_id = { [require('sequelize').Op.like]: subIdMatch };
            if (schedule_id) where.schedule_id = schedule_id;
        } else if (type === 'PITLINE') {
            Model = InspectionAnswer;
            where.module_type = 'PITLINE';
            where.resolved = 0; // Strict Ph 7

            if (session_id) {
                where.session_id = session_id;
            } else {
                // If no session_id, fallback to IDs but this is where "previous sessions" leak
                if (train_id) where.train_id = train_id;
                if (coach_id) where.coach_id = coach_id;
            }

            if (!train_id && !coach_id && !session_id) {
                return res.status(400).json({ error: 'PitLine requires at least session_id or coach_id context' });
            }
        } else if (type === 'AMENITY') {
            Model = InspectionAnswer;
            // SAFE module_type removal for AMENITY
            if (where.module_type === 'WSP') {
                delete where.module_type;
            }
            where.resolved = 0;
            if (subcategory_id) where.subcategory_id = subcategory_id;
            if (compartment_id) where.compartment_id = compartment_id;
        } else {
            Model = InspectionAnswer;
            where.resolved = 0; // Strict Ph 7
            if (subcategory_id) where.subcategory_id = subcategory_id;
            if (compartment_id) where.compartment_id = compartment_id;
        }

        // --- DATA ISOLATION ---
        if (req.user && req.user.role !== 'SUPER_ADMIN') {
            if (Model && Model.rawAttributes && Model.rawAttributes.user_id) {
                where.user_id = req.user.id;
            }
        }

        let defects = [];
        if (type === 'AMENITY') {
            // Data-based fallback (NOT count-based)
            defects = await CommissionaryAnswer.findAll({ where });
            if (!defects || defects.length === 0) {
                // Fallback to InspectionAnswer with WSP filter
                defects = await InspectionAnswer.findAll({ where: { ...where, module_type: 'WSP' } });
            }
        } else {
            defects = await Model.findAll({ where });
        }
        const { normalizeImagePath, findImageByTimestamp } = require('../utils/pathHelper');

        const processedDefects = await Promise.all(defects.map(async (d) => {
            const defectObj = d.toJSON ? d.toJSON() : d;

            if (type === 'CAI' && !defectObj.photo_url) {
                defectObj.photo_url = defectObj.before_photo_url;
            }

            let photoUrl = normalizeImagePath(defectObj.photo_url) || normalizeImagePath(defectObj.image_path) || null;

            // Salvage: If no photo, try Temporal Salvage
            if (!photoUrl) {
                photoUrl = findImageByTimestamp(defectObj.createdAt || defectObj.created_at);
            }

            return {
                ...defectObj,
                photo_url: toAbsoluteUrl(photoUrl) || defectObj.photo_url || defectObj.image_path || null,
                after_photo_url: toAbsoluteUrl(normalizeImagePath(defectObj.after_photo_url) || normalizeImagePath(defectObj.resolved_image_path) || null) || defectObj.after_photo_url || null
            };
        }));

        res.set('Cache-Control', 'no-cache');
        res.json({ success: true, defects: processedDefects });

    } catch (err) {
        console.error('Get Defects Error:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch defects', details: err.message });
    }
};

/**
 * Universal Auto-Save
 * POST /api/inspection/autosave
 */
exports.autosave = async (req, res) => {
    try {
        const {
            module_type,
            session_id,
            question_id,
            status,
            remarks,
            reason_ids,
            photo_url,
            train_id,
            coach_id,
            compartment_id,
            activity_type
        } = req.body;
        let subcategory_id = req.body.subcategory_id;
        // NORMALIZATION GUARD: Coerce 0 or missing to NULL to prevent FK violations
        if (!subcategory_id || subcategory_id === 0 || subcategory_id === '0') {
            subcategory_id = null;
        }

        const moduleType = (module_type || '').toUpperCase().trim();

        // Safety Validation: Ensure polymorphic context is known
        if (!module_type) {
            throw new Error("module_type required");
        }

        // Phase 6: Strict validation at top (WSP/AMENITY can save pre-session without session_id)
        if (!question_id) {
            console.error('[AUTOSAVE ERROR] Missing question_id:', { module_type, session_id, question_id });
            return res.status(400).json({ error: 'Missing question_id' });
        }
        if (!session_id && moduleType !== 'WSP' && moduleType !== 'AMENITY') {
            console.error('[AUTOSAVE ERROR] Missing session_id for strict module:', moduleType);
            return res.status(400).json({ error: 'Missing session_id' });
        }



        // Phase 26: Softened Autosave Validation
        // Deficiency records are allowed to be incomplete during autosave
        // Validation will be enforced at Checkpoint and Submission

        // Normalize image paths to absolute URLs
        const normalizePath = (p) => toAbsoluteUrl(p);

        const pickBestIncoming = (existing, ...incoming) => {
            // Priority 1: Current valid server path in database
            if (existing && typeof existing === 'string' && (existing.includes('uploads/') || existing.startsWith('http'))) return toAbsoluteUrl(existing);

            // Priority 2: Any incoming path that looks like a server upload path
            const incomingServerPath = incoming.find(p => p && typeof p === 'string' && p.includes('uploads/'));
            if (incomingServerPath) return toAbsoluteUrl(incomingServerPath);

            // Priority 3: First valid string (likely a file:// or absolute path)
            return toAbsoluteUrl(incoming.find(p => p && typeof p === 'string') || null);
        };

        const incomingPhoto = pickBestIncoming(photo_url, req.body.image_url, req.body.image_path);
        const finalPhotoUrl = normalizePath(incomingPhoto);

        // Standardized reason handling across all modules
        let finalReasons = [];
        if (reason_ids) {
            if (Array.isArray(reason_ids)) {
                finalReasons = reason_ids;
            } else if (typeof reason_ids === 'string') {
                try {
                    const parsed = JSON.parse(reason_ids);
                    finalReasons = Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) {
                    finalReasons = reason_ids.split(',').map(r => r.trim()).filter(Boolean);
                }
            }
        }

        // 0. PITLINE Block (PRIORITIZED & ISOLATED)
        if (moduleType === 'PITLINE') {
            if (!coach_id) {
                return res.status(400).json({ error: 'coach_id required for PITLINE' });
            }

            const [session] = await PitLineSession.findOrCreate({
                where: { id: session_id },
                defaults: { status: 'IN_PROGRESS' }
            });

            if (session.status === 'SUBMITTED' || session.status === 'CLOSED') {
                return res.status(403).json({ error: 'Cannot edit a submitted inspection' });
            }

            if (session.status === 'DRAFT') {
                await session.update({ status: 'IN_PROGRESS' });
            }

            // Phase: Defect Locking Check
            const existingAnswer = await InspectionAnswer.findOne({
                where: { session_id, question_id, coach_id }
            });

            if (existingAnswer && existingAnswer.defect_locked) {
                return res.status(403).json({ error: 'Defect locked. Resolve it from Defects tab.' });
            }

            // Phase: Evaluate Completeness for Locking
            let isComplete = false;
            if (status === 'DEFICIENCY') {
                const hasReasons = Array.isArray(finalReasons) && finalReasons.length > 0;
                const hasRemarks = !!remarks && remarks.trim().length > 0;
                const hasPhoto = !!finalPhotoUrl;
                if (hasReasons && hasRemarks && hasPhoto) {
                    isComplete = true;
                }
            }

            // Fetch question metadata for snapshotting
            const question = await Question.findByPk(question_id);
            const questionText = question ? question.text : 'N/A';
            const categoryName = question ? question.category : 'General';

            await InspectionAnswer.upsert({
                session_id: session_id || null,
                train_id: train_id || session.train_id || null,
                coach_id: coach_id || session.coach_id || null,
                question_id,
                question_text_snapshot: questionText,
                category_name: categoryName,
                status: status || 'OK',
                remarks: remarks || '',
                reasons: finalReasons,
                photo_url: finalPhotoUrl,
                image_path: finalPhotoUrl,
                module_type: 'PITLINE',
                resolved: 0,
                defect_locked: isComplete ? 1 : 0,
                subcategory_id: subcategory_id,
                compartment_id: compartment_id || 'NA',
                activity_type: activity_type || 'Major',
                schedule_id: req.body.schedule_id || null,
                observed_value: req.body.observed_value !== undefined ? req.body.observed_value : null
            });

            // Phase 26: Trigger projection for PITLINE (ASYNCHRONOUS via setImmediate)
            const ReportingProjectionService = require('../services/ReportingProjectionService');
            setImmediate(() => {
                ReportingProjectionService.projectSession(session_id, 'PITLINE')
                    .catch(err => console.error(`[AUTOSAVE PROJECTION ERROR] PITLINE:${session_id}`, err));
            });

            return res.json({ success: true, message: 'PitLine autosave successful', defect_locked: isComplete });
        }



        switch (moduleType) {
            case 'SICKLINE':
                AnswerModel = SickLineAnswer;
                break;
            case 'CAI':
                AnswerModel = CaiAnswer;
                break;
            case 'WSP':
                AnswerModel = InspectionAnswer;
                break;
            case 'COMMISSIONARY':
            case 'AMENITY':
                AnswerModel = CommissionaryAnswer;
                break;
            case 'PITLINE':
                AnswerModel = InspectionAnswer;
                break;
            default:
                return res.status(400).json({ error: 'Invalid module_type' });
        }

        let session = null;
        if (session_id) {
            session = await SessionResolutionService.resolveSession(session_id, moduleType);
            if (!session) return res.status(404).json({ error: 'Session not found' });
            const userRole = req.user?.role?.toUpperCase();
            const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN';

            if ((session.status === 'SUBMITTED' || session.status === 'CLOSED' || session.status === 'COMPLETED') && !isAdmin) {
                return res.status(403).json({ error: 'Cannot edit a submitted or closed inspection' });
            }

            // Phase 26: Robust status transition (only move from DRAFT to IN_PROGRESS once)
            if (session.status === 'DRAFT') {
                console.log(`[STATUS] Session ${session_id} moving DRAFT -> IN_PROGRESS`);
                await session.update({ status: 'IN_PROGRESS', updatedAt: new Date() });
            }
        }

        // Phase: Defect Locking Check (Shared Logic)
        let compartment_id_val = compartment_id || 'NA';
        let subcategory_id_val = subcategory_id; // Already normalized
        let activity_type_val = activity_type || 'Major';

        // NEW: Enforce CAI defaults to match retrieval logic in CaiController
        if (moduleType === 'CAI') {
            subcategory_id_val = 0;
            activity_type_val = 'NA';
        }

        let existingQuery = { 
            session_id, 
            question_id,
            coach_id: coach_id || (session ? session.coach_id : null),
            compartment_id: compartment_id_val,
            subcategory_id: subcategory_id_val,
            activity_type: activity_type_val,
            schedule_id: req.body.schedule_id || null
        };
        
        // Phase 26: Adaptive Query (Filter keys not in model to prevent 500)
        if (AnswerModel.rawAttributes) {
            Object.keys(existingQuery).forEach(key => {
                if (!AnswerModel.rawAttributes[key] && existingQuery[key] !== undefined) {
                    delete existingQuery[key];
                }
            });
        }

        const existingAnswer = await AnswerModel.findOne({ where: existingQuery });
        if (existingAnswer && existingAnswer.defect_locked) {
            return res.status(403).json({ error: 'Defect locked. Resolve it from Defects tab.' });
        }

        // Phase: Evaluate Completeness for Locking
        let isComplete = false;
        if (status === 'DEFICIENCY') {
            const hasReasons = Array.isArray(finalReasons) && finalReasons.length > 0;
            const hasRemarks = !!remarks && remarks.trim().length > 0;
            const hasPhoto = !!finalPhotoUrl;
            if (hasReasons && hasRemarks && hasPhoto) {
                isComplete = true;
            }
        }

        // 2. Fetch Question for snapshot
        let qData;
        if (moduleType === 'CAI') {
            qData = await CaiQuestion.findByPk(question_id);
        } else {
            qData = await Question.findByPk(question_id);
        }
        if (!qData) return res.status(404).json({ error: 'Question not found' });

        // finalPhotoUrl is already normalized at the top
        // 3. Upsert Logic with Module Specialized Routing
        if (moduleType === 'CAI') {
            console.log('[AUTOSAVE CAI]', { session_id, coach_id: session.coach_id, question_id });

            const [ansRecord, created] = await AnswerModel.findOrCreate({
                where: {
                    session_id,
                    question_id,
                    coach_id: session.coach_id,
                    compartment_id: compartment_id_val,
                    subcategory_id: subcategory_id_val,
                    activity_type: activity_type_val
                },
                defaults: {
                    status: status, // Saved exactly
                    remarks: remarks || '',
                    reason_ids: Array.isArray(reason_ids) ? reason_ids : [],
                    before_photo_url: finalPhotoUrl,
                    photo_url: finalPhotoUrl,
                    image_path: finalPhotoUrl,
                    question_text_snapshot: qData.question_text || qData.text,
                    defect_locked: isComplete ? 1 : 0,
                    observed_value: req.body.observed_value !== undefined ? req.body.observed_value : null
                }
            });
            if (!created) {
                await ansRecord.update({
                    status: status, // Saved exactly
                    remarks: remarks !== undefined ? remarks : ansRecord.remarks,
                    reason_ids: Array.isArray(reason_ids) ? reason_ids : ansRecord.reason_ids,
                    before_photo_url: finalPhotoUrl || ansRecord.before_photo_url,
                    image_path: finalPhotoUrl || ansRecord.image_path || ansRecord.before_photo_url,
                    defect_locked: isComplete ? 1 : 0,
                    observed_value: req.body.observed_value !== undefined ? req.body.observed_value : ansRecord.observed_value
                });
            }
        } else if (moduleType === 'COMMISSIONARY') {
            const [ansRecord, created] = await AnswerModel.findOrCreate({
                where: {
                    session_id,
                    question_id,
                    coach_id: session.coach_id,
                    compartment_id: compartment_id_val,
                    subcategory_id: subcategory_id_val,
                    activity_type: activity_type_val,
                    module_type: 'COMMISSIONARY'
                },
                defaults: {
                    status: status || 'OK',
                    remarks: remarks || '',
                    reasons: finalReasons,
                    photo_url: finalPhotoUrl,
                    image_path: finalPhotoUrl,
                    question_text_snapshot: qData.text,
                    defect_locked: isComplete ? 1 : 0,
                    module_type: 'COMMISSIONARY'
                }
            });

            if (!created) {
                await ansRecord.update({
                    status: status || ansRecord.status,
                    remarks: remarks !== undefined ? remarks : ansRecord.remarks,
                    reasons: finalReasons,
                    photo_url: finalPhotoUrl || ansRecord.photo_url,
                    image_path: finalPhotoUrl || ansRecord.image_path || ansRecord.photo_url,
                    defect_locked: isComplete ? 1 : 0
                });
            }
        } else if (moduleType === 'SICKLINE') {
            console.log('[AUTOSAVE SICKLINE]', { session_id, coach_id: session.coach_id, question_id });

            const [ansRecord, created] = await AnswerModel.findOrCreate({
                where: {
                    session_id,
                    question_id,
                    coach_id: session.coach_id,
                    compartment_id: compartment_id || 'NA',
                    subcategory_id: subcategory_id,
                    activity_type: activity_type || 'Major'
                },
                defaults: {
                    status: status || 'OK',
                    remarks: remarks || '',
                    reasons: Array.isArray(reason_ids) ? reason_ids : [],
                    photo_url: finalPhotoUrl,
                    image_path: finalPhotoUrl,
                    question_text_snapshot: qData.text,
                    defect_locked: isComplete ? 1 : 0
                }
            });

            if (!created) {
                await ansRecord.update({
                    status: status || ansRecord.status,
                    remarks: remarks !== undefined ? remarks : ansRecord.remarks,
                    reasons: Array.isArray(reason_ids) ? reason_ids : ansRecord.reasons,
                    photo_url: finalPhotoUrl || ansRecord.photo_url,
                    image_path: finalPhotoUrl || ansRecord.image_path || ansRecord.photo_url,
                    defect_locked: isComplete ? 1 : 0
                });
            }
        } else if (moduleType === 'WSP') {
            console.log('[AUTOSAVE WSP BLOCK ENTERED]');

            // Fallback to body coach_id if pre-session (session is null)
            const resolvedCoachId = session ? session.coach_id : coach_id;
            const wspFinalReasons = Array.isArray(finalReasons) ? JSON.stringify(finalReasons) : JSON.stringify([]);
            
            // For WSP, the frontend sends the schedule name (e.g. "Shop Schedule-II") in activity_type
            const schName = activity_type || 'WSP Schedule';

            const [answer, created] = await InspectionAnswer.findOrCreate({
                where: {
                    session_id: session_id || null,
                    question_id,
                    coach_id: resolvedCoachId,
                    subcategory_id: subcategory_id,
                    compartment_id: compartment_id || 'NA',
                    activity_type: activity_type || 'Major',
                    schedule_id: req.body.schedule_id || null
                },
                defaults: {
                    session_id: session_id || null,
                    question_id,
                    coach_id: resolvedCoachId,
                    status: status || 'OK',
                    remarks: remarks || '',
                    reasons: wspFinalReasons,
                    photo_url: finalPhotoUrl,
                    image_path: finalPhotoUrl,
                    subcategory_id: subcategory_id,
                    compartment_id: compartment_id || 'NA',
                    activity_type: activity_type || 'Major',
                    schedule_name: schName, // PERSIST SCHEDULE NAME
                    schedule_id: req.body.schedule_id || null,
                    module_type: moduleType,
                    resolved: 0,
                    defect_locked: isComplete ? 1 : 0,
                    observed_value: req.body.observed_value !== undefined ? req.body.observed_value : null
                }
            });

            if (!created) {
                await InspectionAnswer.update({
                    status: status || answer.status,
                    remarks: remarks !== undefined ? remarks : answer.remarks,
                    reasons: wspFinalReasons,
                    photo_url: finalPhotoUrl || answer.photo_url,
                    image_path: finalPhotoUrl || answer.image_path || answer.photo_url,
                    subcategory_id: subcategory_id || answer.subcategory_id,
                    compartment_id: (compartment_id || 'NA') || answer.compartment_id,
                    activity_type: (activity_type || 'Major') || answer.activity_type,
                    schedule_name: schName || answer.schedule_name, // PERSIST SCHEDULE NAME
                    schedule_id: (req.body.schedule_id || null) || answer.schedule_id,
                    defect_locked: isComplete ? 1 : 0,
                    observed_value: req.body.observed_value !== undefined ? req.body.observed_value : answer.observed_value
                }, {
                    where: { id: answer.id }
                });
            }
            // Logic continues to projection below
        } else if (moduleType === 'AMENITY') {
            const resolvedCoachId = session ? session.coach_id : coach_id;
            console.log(`[AUTOSAVE AMENITY] Attempting findOrCreate for session ${session_id}, question ${question_id}`);

            const [ansRecord, created] = await AnswerModel.findOrCreate({
                where: {
                    session_id,
                    question_id,
                    coach_id: resolvedCoachId,
                    compartment_id: compartment_id_val,
                    subcategory_id: subcategory_id_val,
                    activity_type: activity_type_val,
                    module_type: 'AMENITY'
                },
                defaults: {
                    status: status || 'OK',
                    remarks: remarks || '',
                    reasons: finalReasons,
                    photo_url: finalPhotoUrl,
                    image_path: finalPhotoUrl,
                    question_text_snapshot: qData.text,
                    defect_locked: isComplete ? 1 : 0,
                    module_type: 'AMENITY',
                    observed_value: req.body.observed_value !== undefined ? req.body.observed_value : null
                }
            });

            console.log(`[AUTOSAVE AMENITY] Record ${created ? 'created' : 'found'}:`, ansRecord.id);

            if (!created) {
                await ansRecord.update({
                    status: status || ansRecord.status,
                    remarks: remarks !== undefined ? remarks : ansRecord.remarks,
                    reasons: finalReasons,
                    photo_url: finalPhotoUrl || ansRecord.photo_url,
                    image_path: finalPhotoUrl || ansRecord.image_path || ansRecord.photo_url,
                    defect_locked: isComplete ? 1 : 0,
                    schedule_id: (req.body.schedule_id || null) || ansRecord.schedule_id,
                    observed_value: req.body.observed_value !== undefined ? req.body.observed_value : ansRecord.observed_value
                });
            }
        }

        // Phase 26: Trigger Reporting Projection (ASYNCHRONOUS via setImmediate)
        const ReportingProjectionService = require('../services/ReportingProjectionService');
        setImmediate(() => {
            ReportingProjectionService.projectSession(session_id, moduleType)
                .catch(err => console.error(`[AUTOSAVE PROJECTION ERROR] ${moduleType}:${session_id}`, err));
        });

        res.json({ success: true, message: 'Autosave successful', defect_locked: isComplete });

    } catch (err) {
        console.error('Universal Autosave Error:', err.message, err.stack);
        // Special safe return to prevent server crash and allow frontend to continue
        if (req.body.module_type === 'sickline') {
            return res.status(200).json({ success: false, error: 'Autosave failed safely', details: err.message });
        }
        res.status(500).json({ error: 'Autosave failed', details: err.message });
    }
};

/**
 * Universal Save Checkpoint
 * POST /api/inspection/save-checkpoint
 */
exports.saveCheckpoint = async (req, res) => {
    console.time("saveCheckpoint");
    const maxRetries = 3;
    let attempt = 0;

    try {
        const { module_type, session_id, answers } = req.body;

        const type = (module_type || '').toUpperCase();

        if (!session_id && (!answers || answers.length === 0)) {
            console.timeEnd("saveCheckpoint");
            return res.status(200).json({ success: true, message: 'Empty checkpoint skipped' });
        }

        if (!module_type || !session_id) {
            console.timeEnd("saveCheckpoint");
            return res.status(400).json({ error: 'Missing module_type or session_id' });
        }

        if (answers && answers.length > 500) {
            console.timeEnd("saveCheckpoint");
            return res.status(400).json({ error: "Payload too large" });
        }

        let AnswerModel;
        switch (type) {
            case 'SICKLINE': 
                AnswerModel = SickLineAnswer;
                break;
            case 'CAI': 
                AnswerModel = CaiAnswer;
                break;
            case 'WSP':
                AnswerModel = InspectionAnswer;
                break;
            case 'COMMISSIONARY': 
            case 'AMENITY':
                AnswerModel = CommissionaryAnswer;
                break;
            case 'PITLINE': 
                AnswerModel = InspectionAnswer;
                break;
            default: 
                console.timeEnd("saveCheckpoint");
                return res.status(400).json({ error: 'Invalid module_type' });
        }

        const session = await SessionResolutionService.resolveSession(session_id, type);
        if (!session) {
            console.timeEnd("saveCheckpoint");
            return res.status(404).json({ error: 'Session not found' });
        }
        const userRole = req.user?.role?.toUpperCase();
        const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN';

        if ((session.status === 'SUBMITTED' || session.status === 'CLOSED' || session.status === 'COMPLETED') && !isAdmin) {
            console.timeEnd("saveCheckpoint");
            return res.status(403).json({ error: 'Cannot edit a submitted or closed inspection' });
        }

        const normalizePath = toAbsoluteUrl;

        if (answers && Array.isArray(answers)) {
            const upsertDataArray = [];

            for (const ans of answers) {
                const question_id = ans.question_id;
                if (!question_id) {
                    console.warn(`[WARN] Skipping answer record without question_id:`, ans);
                    continue;
                }
                const status = ans.status;
                const remarks = ans.remarks;
                const reason_ids = ans.reasons || ans.reason_ids;

                let subcategory_id = ans.subcategory_id;
                // NORMALIZATION GUARD: Coerce 0 or missing to NULL to prevent FK violations
                if (!subcategory_id || subcategory_id === 0 || subcategory_id === '0') {
                    subcategory_id = null;
                }

                const imagePath = normalizePath(ans.photo_url || ans.image_url || ans.image_path);
                let finalReasons = Array.isArray(reason_ids) ? reason_ids : [];
                
                let upsertData = {
                    session_id,
                    question_id,
                    coach_id: ans.coach_id || session.coach_id,
                    status: status || 'OK',
                    remarks: remarks || '',
                    reasons: type === 'WSP' ? JSON.stringify(finalReasons) : finalReasons,
                    reason_ids: type === 'CAI' ? finalReasons : undefined,
                    photo_url: imagePath,
                    image_path: imagePath,
                    before_photo_url: imagePath,
                    defect_locked: 0,
                    updatedAt: new Date(),
                    compartment_id: ans.compartment_id || 'NA',
                    subcategory_id: subcategory_id,
                    activity_type: ans.activity_type || 'Major',
                    schedule_name: type === 'WSP' ? (ans.activity_type || 'WSP Schedule') : undefined, // PERSIST SCHEDULE NAME
                    module_type: type,
                    schedule_id: ans.schedule_id || req.body.schedule_id || null,
                    observed_value: ans.observed_value !== undefined ? ans.observed_value : null
                };

                // POLYMORPHIC DATA NORMALIZATION:
                // Filter keys to only those actually defined in the model to prevent 500 errors on missing columns
                if (AnswerModel.rawAttributes) {
                    const filteredData = {};
                    Object.keys(upsertData).forEach(key => {
                        if (AnswerModel.rawAttributes[key]) {
                            filteredData[key] = upsertData[key];
                        }
                    });
                    upsertData = filteredData;
                }

                upsertDataArray.push(upsertData);
            }




            // Retry Loop Logic
            while (attempt < maxRetries) {
                const transaction = await sequelize.transaction();
                try {
                    // Filter requested update fields dynamically based on model attributes
                    // CRITICAL: Exclude resolution-state fields to prevent checkpoint saves from
                    // overwriting a defect that was previously resolved via resolveDefect().
                    const RESOLUTION_PROTECTED_FIELDS = new Set([
                        'resolved', 'resolved_at', 'resolved_by', 'resolution_remark', 'after_photo_url'
                    ]);

                    const allowedFields = Object.keys(AnswerModel.rawAttributes).filter(field =>
                        field !== 'id' &&
                        field !== 'createdAt' &&
                        !RESOLUTION_PROTECTED_FIELDS.has(field)
                    );

                    await AnswerModel.bulkCreate(upsertDataArray, {
                        updateOnDuplicate: allowedFields.length > 0 ? allowedFields : undefined,
                        transaction
                    });

                    // Update timestamp and trigger projection
                    session.last_saved_at = new Date();
                    await session.save({ transaction });

                    await transaction.commit();

                    const ReportingProjectionService = require('../services/ReportingProjectionService');
                    setImmediate(() => {
                        ReportingProjectionService.projectSession(session_id, type)
                            .catch(err => console.error(`[CHECKPOINT PROJECTION ERROR] ${type}:${session_id}`, err));
                    });

                    console.timeEnd("saveCheckpoint");
                    return res.json({ success: true, message: 'Checkpoint saved with data' });

                } catch (err) {
                    await transaction.rollback();
                    attempt++;
                    
                    const isRetryable = err.name === 'SequelizeConnectionError' || 
                                      err.name === 'SequelizeTimeoutError' || 
                                      err.code === 'ETIMEDOUT';

                    if (isRetryable && attempt < maxRetries) {
                        const delay = Math.pow(2, attempt - 1) * 1000;
                        console.warn(`[RETRY] attempt ${attempt} failed, retrying in ${delay}ms...`, err.message);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        throw err;
                    }
                }
            }
        } else {
            console.timeEnd("saveCheckpoint");
            return res.json({ success: true, message: 'Checkpoint skipped (no answers)' });
        }

    } catch (err) {
        console.timeEnd("saveCheckpoint");
        console.error('Save Checkpoint Error:', err.message, err.stack);
        res.status(500).json({ error: 'Checkpoint failed', details: err.message });
    }
};

/**
 * GET /api/inspection/progress
 * Standardized progress calculation for all modules
 */
exports.getProgress = async (req, res) => {
    try {
        const { session_id, module_type, coach_id, subcategory_id, activity_type, compartment_id, schedule_id } = req.query;
        if (!session_id || !module_type) {
            return res.status(400).json({ error: 'session_id and module_type are required' });
        }

        const { Op } = require('sequelize');

        let totalCount = 0;
        let answeredCount = 0;
        let perSubcategoryStatus = [];

        const type = (module_type || '').toUpperCase();
        const validModules = ['PITLINE', 'SICKLINE', 'COMMISSIONARY', 'WSP', 'CAI', 'AMENITY'];
        if (!validModules.includes(type)) {
            return res.status(400).json({ error: `Invalid module_type: ${type}` });
        }

        // PHASE 7: Strict Context Matching
        // For AMENITY/PITLINE crossovers, we must be careful with module_type field in DB
        const contextFilter = {};
        
        // If it's AMENITY or PITLINE, they both share InspectionAnswer and often overlap
        if (type === 'PITLINE' || type === 'AMENITY') {
             // We allow either module_type for cross-lookups
             contextFilter.module_type = { [Op.in]: ['PITLINE', 'AMENITY', 'WSP'] }; 
             contextFilter[Op.or] = [
                 { session_id: session_id },
                 { submission_id: String(session_id) }
             ];
        } else {
             contextFilter.module_type = type;
             contextFilter.session_id = session_id;
        }

        if (coach_id) contextFilter.coach_id = coach_id;
        if (subcategory_id && subcategory_id != 0) contextFilter.subcategory_id = subcategory_id;
        if (activity_type) contextFilter.activity_type = activity_type;
        if (compartment_id && compartment_id !== 'NA') contextFilter.compartment_id = compartment_id;
        if (schedule_id) contextFilter.schedule_id = schedule_id;

        if (type === 'COMMISSIONARY' || type === 'AMENITY') {
            const session = await SessionResolutionService.resolveSession(session_id, type);
            if (!session) return res.status(404).json({ error: 'Session not found' });

            const subcategories = await AmenitySubcategory.findAll({ where: { category_id: 6 } });
            
            for (const sub of subcategories) {
                const items = await AmenityItem.findAll({ where: { subcategory_id: sub.id } });
                const itemIds = items.map(i => i.id);
                
                const qCount = await Question.count({ where: { amenity_item_id: itemIds, is_active: 1 } });
                const aCount = await CommissionaryAnswer.count({ 
                    where: { ...contextFilter, subcategory_id: sub.id, module_type: type } 
                });

                totalCount += qCount;
                answeredCount += aCount;

                perSubcategoryStatus.push({
                    name: sub.name,
                    id: sub.id,
                    total: qCount,
                    answered: aCount,
                    completed: qCount > 0 && aCount >= qCount
                });
            }
        } else if (type === 'PITLINE') {
            const session = await SessionResolutionService.resolveSession(session_id, type);
            if (!session) return res.status(404).json({ error: 'Session not found' });

            // If a specific subcategory is requested, we only calculate for that subcategory
            const targetSubId = subcategory_id && subcategory_id != 0 ? subcategory_id : null;
            
            if (targetSubId) {
                const sub = await AmenitySubcategory.findByPk(targetSubId);
                if (!sub) return res.status(404).json({ error: 'Subcategory not found' });

                const questionFilter = { is_active: 1 };
                if (targetSubId == 179) {
                    questionFilter.category = 'Undergear';
                } else {
                    questionFilter.subcategory_id = targetSubId;
                }

                const questions = await Question.findAll({
                    where: questionFilter,
                    attributes: ['id', 'answer_type']
                });

                const qIds = questions.map(q => q.id);
                const answers = await InspectionAnswer.findAll({
                    where: { ...contextFilter, question_id: qIds },
                    attributes: ['question_id', 'status', 'observed_value']
                });

                const aMap = new Map(answers.map(a => [a.question_id, a]));
                let areaAnsweredCount = 0;

                for (const q of questions) {
                    const ans = aMap.get(q.id);
                    if (!ans) continue;
                    if (q.answer_type === 'VALUE') {
                        if (ans.observed_value !== null && String(ans.observed_value).trim() !== '') areaAnsweredCount++;
                    } else {
                        if (ans.status !== null && ans.status !== '') areaAnsweredCount++;
                    }
                }

                totalCount = questions.length;
                answeredCount = areaAnsweredCount;
                perSubcategoryStatus.push({
                    id: sub.id,
                    name: sub.name,
                    total: totalCount,
                    answered: answeredCount,
                    totalCount,      // Standard
                    answeredCount,   // Standard
                    completed: totalCount > 0 && answeredCount >= totalCount
                });
            } else {
                // Global pitline progress breakdown - Loop through relevant subcategories for the module areas
                const subIds = [119, 120, 175, 176, 177, 178, 179, 186];
                const subcategories = await AmenitySubcategory.findAll({
                    where: { id: { [Op.in]: subIds } }
                });

                for (const sub of subcategories) {
                    const questionFilter = { is_active: 1 };
                    
                    if (sub.id === 179) {
                        questionFilter.category = 'Undergear';
                    } else {
                        questionFilter.subcategory_id = sub.id;
                    }

                    const questions = await Question.findAll({
                        where: questionFilter,
                        attributes: ['id', 'answer_type', 'activity_type']
                    });

                    if (questions.length === 0) continue;

                    const qIds = questions.map(q => q.id);
                    const answers = await InspectionAnswer.findAll({
                        where: { ...contextFilter, question_id: qIds },
                        attributes: ['question_id', 'status', 'observed_value', 'activity_type']
                    });

                    const aMap = new Map(answers.map(a => [a.question_id, a]));
                    let subAnswered = 0;
                    
                    let majorTotal = 0;
                    let majorAnswered = 0;
                    let minorTotal = 0;
                    let minorAnswered = 0;

                    for (const q of questions) {
                        const isMajor = q.activity_type === 'Major';
                        if (isMajor) majorTotal++;
                        else minorTotal++;

                        const ans = aMap.get(q.id);
                        if (!ans) continue;

                        let isAnswered = false;
                        if (q.answer_type === 'VALUE') {
                            if (ans.observed_value !== null && String(ans.observed_value).trim() !== '') isAnswered = true;
                        } else {
                            if (ans.status !== null && ans.status !== '') isAnswered = true;
                        }

                        if (isAnswered) {
                            subAnswered++;
                            if (isMajor) majorAnswered++;
                            else minorAnswered++;
                        }
                    }

                    perSubcategoryStatus.push({
                        id: sub.id,
                        name: sub.name,
                        total: questions.length,
                        answered: subAnswered,
                        totalCount: questions.length,
                        answeredCount: subAnswered,
                        majorTotal,
                        majorAnswered,
                        minorTotal,
                        minorAnswered,
                        completed: questions.length > 0 && subAnswered >= questions.length
                    });

                    totalCount += questions.length;
                    answeredCount += subAnswered;
                }
            }
            
            // If targetSubId was provided, we also need to split by Major/Minor for ActivitySelectionScreen
            if (targetSubId && perSubcategoryStatus.length > 0) {
                const subStatus = perSubcategoryStatus[0];
                // Major questions for this subcategory
                const majorQs = await Question.findAll({ where: { subcategory_id: targetSubId, activity_type: 'Major', is_active: 1 }, attributes: ['id'] });
                const minorQs = await Question.findAll({ where: { subcategory_id: targetSubId, activity_type: 'Minor', is_active: 1 }, attributes: ['id'] });

                const majorAns = await InspectionAnswer.count({ where: { ...contextFilter, question_id: majorQs.map(q => q.id) } });
                const minorAns = await InspectionAnswer.count({ where: { ...contextFilter, question_id: minorQs.map(q => q.id) } });

                subStatus.majorTotal = majorQs.length;
                subStatus.majorAnswered = majorAns;
                subStatus.minorTotal = minorQs.length;
                subStatus.minorAnswered = minorAns;
            }
        } else if (type === 'SICKLINE') {
            const session = await SessionResolutionService.resolveSession(session_id, type);
            if (!session) return res.status(404).json({ error: 'Session not found' });

            totalCount = await Question.count({ where: { section_code: 'SS1-C', ss1_flag: 'C', is_active: 1 } });
            answeredCount = await SickLineAnswer.count({ where: { session_id } });
            perSubcategoryStatus.push({
                name: 'Examination',
                total: totalCount,
                answered: answeredCount,
                totalCount,     // Standard
                answeredCount,  // Standard
                completed: totalCount > 0 && answeredCount >= totalCount
            });
        } else if (type === 'WSP') {
            const session = await SessionResolutionService.resolveSession(session_id, type);
            if (!session) return res.status(404).json({ error: 'Session not found' });

            if (schedule_id) {
                const sch = await LtrSchedule.findByPk(schedule_id);
                const qTotal = await Question.count({ where: { schedule_id: schedule_id, is_active: 1 } });
                const answeredRows = await InspectionAnswer.findAll({
                    where: { 
                        session_id,
                        module_type: 'WSP',
                        schedule_id: schedule_id
                    },
                    attributes: [[sequelize.fn('DISTINCT', sequelize.col('question_id')), 'question_id']]
                });
                answeredCount = answeredRows.length;
                totalCount = qTotal;
                perSubcategoryStatus.push({
                    id: sch?.id,
                    name: sch?.name || 'WSP Schedule',
                    total: totalCount,
                    answered: answeredCount,
                    totalCount,     // Standard
                    answeredCount,  // Standard
                    completed: totalCount > 0 && answeredCount >= totalCount
                });
            } else {
                // Summary across schedules
                let schedules = await LtrSchedule.findAll({ where: { is_active: 1 } });
                for (const sch of schedules) {
                    const qTotal = await Question.count({ where: { schedule_id: sch.id, is_active: 1 } });
                    const answeredRows = await InspectionAnswer.findAll({
                        where: { ...contextFilter, schedule_id: sch.id },
                        attributes: [[sequelize.fn('DISTINCT', sequelize.col('question_id')), 'question_id']]
                    });
                    const qAnswered = answeredRows.length;
                    if (qTotal > 0) {
                        perSubcategoryStatus.push({
                            id: sch.id,
                            name: sch.name,
                            total: qTotal,
                            answered: qAnswered,
                            totalCount: qTotal,   // Standard
                            answeredCount: qAnswered, // Standard
                            completed: qAnswered >= qTotal
                        });
                        totalCount += qTotal;
                        answeredCount += qAnswered;
                    }
                }
            }

            if (perSubcategoryStatus.length === 0) {
                totalCount = await Question.count({ where: { is_active: 1, schedule_id: { [Op.not]: null } } });
                const fallbackRows = await InspectionAnswer.findAll({
                    where: {
                        session_id: session_id,
                        module_type: 'WSP'
                    },
                    attributes: [[sequelize.fn('DISTINCT', sequelize.col('question_id')), 'question_id']]
                });
                answeredCount = fallbackRows.length;
                perSubcategoryStatus.push({
                    name: 'WSP Test',
                    total: totalCount,
                    answered: answeredCount,
                    completed: totalCount > 0 && answeredCount >= totalCount
                });
            }

        } else if (type === 'CAI') {
            const session = await SessionResolutionService.resolveSession(session_id, type);
            if (!session) return res.status(404).json({ error: 'Session not found' });

            totalCount = await CaiQuestion.count({ where: { is_active: true } });
            answeredCount = await CaiAnswer.count({ where: { session_id } });

            perSubcategoryStatus = [
                { 
                    name: 'CAI', 
                    total: totalCount, 
                    answered: answeredCount, 
                    totalCount,      // Standard
                    answeredCount,   // Standard
                    completed: totalCount > 0 && answeredCount >= totalCount 
                }
            ];
        }

        res.json({
            totalCount,
            answeredCount,
            total: totalCount,    // Legacy compatibility
            answered: answeredCount, // Legacy compatibility
            completed: totalCount > 0 && answeredCount >= totalCount,
            perSubcategoryStatus,
            perAreaStatus: perSubcategoryStatus // Alias for AmenitySubcategoryScreen compatibility
        });

    } catch (err) {
        console.error('getInspectionProgress Error:', err);
        res.status(500).json({ error: 'Failed to calculate progress', details: err.message });
    }
};

/**
 * GET /api/inspection/answers
 * Universal endpoint to fetch answers for hydration (Mobile App)
 */
exports.getAnswers = async (req, res) => {
    try {
        const { 
            session_id, module_type, subcategory_id, coach_id, coach_number,
            compartment_id, activity_type, schedule_id 
        } = req.query;

        if (!session_id && !coach_id && !coach_number) {
            return res.status(400).json({ error: 'Missing session_id, coach_id, or coach_number' });
        }

        const type = (module_type || '').toUpperCase();
        let query = {};
        
        if (session_id) query.session_id = session_id;
        if (coach_id) query.coach_id = coach_id;
        if (type) query.module_type = type; // Strict filtering by module_type
        
        if (subcategory_id !== undefined && subcategory_id !== null && Number(subcategory_id) !== 0) {
            query.subcategory_id = subcategory_id;
        }

        if (compartment_id) query.compartment_id = compartment_id;
        if (activity_type) query.activity_type = activity_type;
        if (schedule_id) query.schedule_id = schedule_id;

        let Model = InspectionAnswer;
        if (type === 'COMMISSIONARY' || type === 'AMENITY') {
            Model = CommissionaryAnswer;
        } else if (type === 'SICKLINE') {
            Model = SickLineAnswer;
        } else if (type === 'CAI') {
            Model = CaiAnswer;
        }
        // WSP, PITLINE stay with InspectionAnswer

        const answers = await Model.findAll({ where: query });
        res.json({ success: true, answers });
    } catch (err) {
        console.error('getAnswers Error:', err);
        res.status(500).json({ error: 'Failed to fetch answers', details: err.message });
    }
};
