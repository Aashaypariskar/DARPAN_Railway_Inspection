const {
    sequelize,
    PitLineSession, WspSession, CommissionarySession, SickLineSession, CaiSession,
    InspectionAnswer, CommissionaryAnswer, SickLineAnswer, CaiAnswer,
    CaiQuestion, Question,
    User, Coach, PitLineCoach, PitLineTrain, Reason
} = require('../models');
const { QueryTypes } = require('sequelize');
const { FINALIZED_STATUSES, INCOMPLETE_STATUSES } = require('./ReportConstants');
const QuestionRegistryService = require('./QuestionRegistryService');

class ReportingProjectionService {

    /**
     * Projects a session and its answers into reporting tables.
     * Idempotent: Updates if already exists.
     */
    async projectSession(sessionId, moduleType) {
        try {
            const normModuleType = (moduleType || '').toUpperCase().trim();
            console.log(`--- Projecting Session: ${sessionId} (${normModuleType}) ---`);

            // 1. Fetch Session Data & Answers
            const { sessionData, answers } = await this.fetchOperationalData(sessionId, normModuleType);
            if (!sessionData) {
                console.warn(`Session ${sessionId} not found in ${normModuleType}`);
                return;
            }

            // 2. Resolve Reason Names
            const reasonMap = await this.fetchReasonMap();

            // 3. Normalize Session Info & Metrics
            console.log(`[DEBUG]   -> Normalizing session...`);
            const normalizedSession = this.normalizeSession(sessionData, normModuleType);

            console.log(`[DEBUG]   -> Calculating master total...`);
            let masterTotalQuestions = await QuestionRegistryService.getTotalQuestions(normModuleType, {
                subcategory_id: sessionData.subcategory_id,
                schedule_id: sessionData.schedule_id,
                coach_id: sessionData.coach_id
            });
            console.log(`[DEBUG]   -> Master Total: ${masterTotalQuestions}`);
            if (!masterTotalQuestions) masterTotalQuestions = answers.length; // Fallback if 0

            let okCount = 0;
            let deficiencyCount = 0;
            let resolvedCount = 0;
            let attemptedCount = 0;

            console.log(`[DEBUG]   -> Validating ${answers.length} answers...`);
            const validatedAnswers = answers.map(ans => {
                const norm = this.normalizeAnswer(ans, normModuleType, reasonMap);

                // Deep Salvage: If deficiency is missing a photo, check if any sibling record (even an 'OK' one) has it
                if (norm.answer_status === 'DEFICIENCY' && !norm.before_photo_url) {
                    const sibling = answers.find(a =>
                        a.question_id === ans.question_id &&
                        (a.photo_url?.includes('uploads/') || a.before_photo_url?.includes('uploads/') || a.image_path?.includes('uploads/'))
                    );
                    if (sibling) {
                        const { getBestImageUrl } = require('../utils/pathHelper');
                        norm.before_photo_url = getBestImageUrl(sibling.photo_url, sibling.before_photo_url, sibling.image_path);
                        norm.has_before_photo = !!norm.before_photo_url;
                    }
                }

                const qType = (ans.Question?.answer_type || ans.answer_type || 'BOOLEAN').toUpperCase();
                const hasStatus = norm.answer_status === 'OK' || norm.answer_status === 'DEFICIENCY';
                const hasValue = ans.observed_value !== null && String(ans.observed_value).trim() !== '';

                let isAnswered = false;
                if (qType === 'VALUE') {
                    isAnswered = hasValue;
                } else {
                    isAnswered = hasStatus;
                }

                if (isAnswered) {
                    attemptedCount++;
                    if (norm.answer_status === 'OK') okCount++;
                    if (norm.answer_status === 'DEFICIENCY') {
                        deficiencyCount++;
                        if (norm.resolved) resolvedCount++;
                        if (!this.validateDeficiency(ans, reasonMap)) {
                            norm.remark = '[SYS: INCOMPLETE DEFICIENCY] ' + norm.remark;
                        }
                    }
                }
                return norm;
            });
            console.log(`[DEBUG]   -> Answers validated. Attempted: ${attemptedCount}`);

            // 4. Status-based calculations
            let complianceScore = null;
            let progressPercentage = 0;
            const isFinalized = FINALIZED_STATUSES.includes((normalizedSession.status || '').toUpperCase());

            console.log(`[DEBUG]   -> Session Finalized: ${isFinalized}`);

            // Calculate progress clamped to 100
            if (masterTotalQuestions > 0) {
                const rawProgress = (attemptedCount / masterTotalQuestions) * 100;
                progressPercentage = Math.min(100, parseFloat(rawProgress.toFixed(2)));
            }
            if (isFinalized) {
                complianceScore = masterTotalQuestions > 0 ? parseFloat(((okCount / masterTotalQuestions) * 100).toFixed(2)) : 100.00;
                progressPercentage = 100.00;
            }

            // 4. Upsert into reporting_sessions
            console.log(`[DEBUG]   -> Upserting reporting_session...`);
            console.log(`[DEBUG]   -> Upserting reporting_session...`);
            await sequelize.query(`
                INSERT INTO reporting_sessions 
                    (source_session_id, module_type, coach_id, train_id, asset_id, user_id, inspection_datetime, status, total_master_questions, total_deficiencies, total_resolved, compliance_score, attempted_count, progress_percentage, is_finalized, projected_at)
                VALUES 
                    (:source_id, :module, :coach_id, :train_id, :asset_id, :user_id, :datetime, :status, :total_q, :total_d, :total_r, :compliance, :attempted, :progress, :finalized, NOW())
                ON DUPLICATE KEY UPDATE
                    coach_id = VALUES(coach_id),
                    train_id = VALUES(train_id),
                    asset_id = VALUES(asset_id),
                    user_id = VALUES(user_id),
                    inspection_datetime = VALUES(inspection_datetime),
                    status = VALUES(status),
                    total_master_questions = VALUES(total_master_questions),
                    total_deficiencies = VALUES(total_deficiencies),
                    total_resolved = VALUES(total_resolved),
                    compliance_score = VALUES(compliance_score),
                    attempted_count = VALUES(attempted_count),
                    progress_percentage = VALUES(progress_percentage),
                    is_finalized = VALUES(is_finalized),
                    projected_at = NOW()
            `, {
                replacements: {
                    source_id: sessionId,
                    module: normModuleType,
                    coach_id: normalizedSession.coach_id,
                    train_id: normalizedSession.train_id || null,
                    asset_id: normalizedSession.asset_id || 'N/A',
                    user_id: normalizedSession.user_id || 0,
                    datetime: normalizedSession.inspection_datetime,
                    status: normalizedSession.status,
                    total_q: masterTotalQuestions,
                    total_d: deficiencyCount,
                    total_r: resolvedCount,
                    compliance: complianceScore,
                    attempted: attemptedCount,
                    progress: progressPercentage,
                    finalized: isFinalized ? 1 : 0
                },
                type: QueryTypes.INSERT
            });

            console.log(`[DEBUG]   -> Looking up reporting_session ID...`);
            const reportingSessionIdQuery = await sequelize.query(
                'SELECT id FROM reporting_sessions WHERE source_session_id = :source_id AND module_type = :module',
                { replacements: { source_id: sessionId, module: normModuleType }, type: QueryTypes.SELECT }
            );

            if (!reportingSessionIdQuery || reportingSessionIdQuery.length === 0) {
                throw new Error(`Failed to create or find reporting_session for source:${sessionId} module:${normModuleType}`);
            }

            const reportingSessionId = reportingSessionIdQuery[0].id;
            console.log(`[DEBUG]   -> Reporting Session ID: ${reportingSessionId}`);

            // 5. ATOMIC REFRESH: Delete and Re-insert reporting_answers
            await sequelize.query('DELETE FROM reporting_answers WHERE reporting_session_id = :reportSessionId', {
                replacements: { reportSessionId: reportingSessionId }
            });

            if (validatedAnswers.length > 0) {
                const answerValues = validatedAnswers.map(norm => {
                    return [
                        reportingSessionId,
                        norm.question_text,
                        norm.section_title,
                        norm.answer_status,
                        norm.reasons_json,
                        norm.remark,
                        norm.before_photo_url,
                        norm.after_photo_url,
                        norm.resolved ? 1 : 0,
                        norm.source_question_id
                    ];
                });

                await sequelize.query(`
                    INSERT INTO reporting_answers 
                        (reporting_session_id, question_text, section_title, answer_status, reasons_json, remark, before_photo_url, after_photo_url, resolved, source_question_id)
                    VALUES ?
                `, {
                    replacements: [answerValues],
                    type: QueryTypes.INSERT
                });
            }
        } catch (error) {
            console.error(`--- Projection Failed: ${sessionId} ---`, error);
            throw error;
        }
    }

    async reprojectReportingSession(reportingId, sourceSessionId, moduleType) {
        try {
            console.log(`--- Reprojecting Session: ${reportingId} (Source: ${sourceSessionId}, ${moduleType}) ---`);
            
            // 1. Delete associated answers to ensure a clean refresh
            await sequelize.query('DELETE FROM reporting_answers WHERE reporting_session_id = :reportingId', {
                replacements: { reportingId },
                type: QueryTypes.DELETE
            });

            // 2. Re-run projection (which now uses the Question join logic)
            await this.projectSession(sourceSessionId, moduleType);
            
            console.log(`--- Reprojection Complete: ${reportingId} ---`);
        } catch (error) {
            console.error(`--- Reprojection Failed: ${reportingId} ---`, error);
            throw error;
        }
    }

    async fetchReasonMap() {
        const reasons = await Reason.findAll({ attributes: ['id', 'text'], raw: true });
        const map = {};
        reasons.forEach(r => { map[r.id] = r.text; });
        return map;
    }

    // Logic moved to QuestionRegistryService.js

    validateDeficiency(ans, reasonMap) {
        // Phase 32: Permit deficiencies without photos or remarks for initial visibility
        // but still return false if purely empty to flag it in remark
        let hasReason = false;
        try {
            const norm = this.normalizeReasons(ans.reasons || ans.reason_ids, reasonMap);
            hasReason = Array.isArray(norm) && norm.length > 0;
        } catch (e) { }

        const remarkStr = String(ans.remarks || ans.remark || '').trim();
        const hasRemark = remarkStr !== '';
        const hasPhoto = !!ans.photo_url || !!ans.before_photo_url || !!ans.image_path || !!ans.after_photo_url;

        // Return true if it has at least one piece of supporting info
        return hasReason || hasRemark || hasPhoto;
    }

    async fetchOperationalData(sessionId, moduleType) {
        const SessionResolutionService = require('./SessionResolutionService');
        let sessionData, answers = [];
        const includeUser = { model: User, attributes: ['id', 'name'] };
        const includeQuestion = { model: Question, attributes: ['id', 'category', 'item_name', 'section_code', 'text', 'activity_type', 'answer_type'] };

        // Centralized Robust Session Resolution
        sessionData = await SessionResolutionService.resolveSession(sessionId, moduleType);

        if (!sessionData) return { sessionData: null, answers: [] };

        // Load relations based on actual session type
        const actualSessionType = sessionData.constructor.name;
        
        switch (moduleType) {
            case 'AMENITY':
            case 'PITLINE':
                // Re-fetch with includes if needed, or already resolved above but might need specific associations
                if (actualSessionType === 'PitLineSession') {
                   await sessionData.reload({ include: [includeUser, { model: PitLineCoach }, { model: PitLineTrain }] });
                }
                answers = await InspectionAnswer.findAll({ 
                    where: { session_id: sessionId, module_type: moduleType },
                    include: [includeQuestion],
                    order: [['question_id', 'ASC']]
                });
                break;
            case 'WSP':
                if (actualSessionType === 'WspSession') {
                    await sessionData.reload({ include: [includeUser] });
                }
                answers = await InspectionAnswer.findAll({ 
                    where: { session_id: sessionId, module_type: 'WSP' },
                    include: [includeQuestion],
                    order: [['question_id', 'ASC']]
                });
                break;
            case 'COMMISSIONARY':
                if (actualSessionType === 'CommissionarySession') {
                    await sessionData.reload({ include: [includeUser, { model: Coach }] });
                }
                answers = await CommissionaryAnswer.findAll({ 
                    where: { session_id: sessionId },
                    include: [includeQuestion],
                    order: [['id', 'ASC']]
                });
                break;
            case 'SICKLINE':
                if (actualSessionType === 'SickLineSession') {
                    await sessionData.reload({ include: [includeUser, { model: Coach }] });
                }
                answers = await SickLineAnswer.findAll({ 
                    where: { session_id: sessionId },
                    include: [includeQuestion],
                    order: [['id', 'ASC']]
                });
                break;
            case 'CAI':
                if (actualSessionType === 'CaiSession') {
                    await sessionData.reload({ include: [includeUser, { model: Coach }] });
                }
                answers = await CaiAnswer.findAll({ 
                    where: { session_id: sessionId },
                    include: [{ model: CaiQuestion, attributes: ['id', 'cai_code', 'question_text'] }],
                    order: [['id', 'ASC']]
                });
                break;
        }
        return { sessionData, answers };
    }

    normalizeSession(session, moduleType) {
        let coach_id = null, train_id = null, asset_id = 'N/A';
        const user_id = session.inspector_id || session.created_by || session.user_id || 0;

        // Phase 25: Use updatedAt as fallback for datetime to catch reused sessions in "Recent" view
        const datetime = session.inspection_date || session.updatedAt || session.createdAt;

        // Standardize moduleType mapping
        const normalizedModule = (moduleType || '').toUpperCase().trim();

        if (normalizedModule === 'PITLINE') {
            coach_id = session.coach_id;
            train_id = session.train_id;
            asset_id = session.PitLineCoach?.coach_number || 'PIT-' + session.coach_id;
        } else if (normalizedModule === 'AMENITY' || normalizedModule === 'COMMISSIONARY') {
            coach_id = session.coach_id;
            asset_id = session.coach_number || (session.Coach?.coach_number) || 'Asset-' + (session.coach_id || '');
        } else {
            coach_id = session.coach_id;
            asset_id = session.coach_number || (session.Coach?.coach_number) || 'Asset-' + (session.coach_id || '');
        }

        return {
            coach_id: coach_id || null,
            train_id: train_id || null,
            asset_id: asset_id || 'N/A',
            user_id: user_id || 0,
            inspection_datetime: datetime || new Date(),
            status: (session.status || 'UNKNOWN').toUpperCase()
        };
    }

    normalizeAnswer(ans, moduleType, reasonMap) {
        const { normalizeImagePath, getBestImageUrl } = require('../utils/pathHelper');

        // Robust Image Search & Recovery
        const photoUrl = getBestImageUrl(ans.photo_url, ans.before_photo_url, ans.image_path);
        const afterPhotoUrl = normalizeImagePath(ans.after_photo_url || ans.resolved_image_path);

        // Derive Section Title from Question Category or Item Name
        let sectionTitle = ans.category_name || ans.section_title;
        
        if (ans.Question) {
            sectionTitle = ans.Question.category || ans.Question.item_name || sectionTitle;
        } else if (ans.CaiQuestion) {
            sectionTitle = ans.CaiQuestion.cai_code || sectionTitle;
        }

        return {
            source_question_id: ans.question_id,
            question_text: (ans.Question?.text || ans.CaiQuestion?.question_text || ans.question_text_snapshot || ans.question_text || 'N/A').trim(),
            section_title: sectionTitle || 'General',
            answer_status: (ans.status || 'NOT_ATTEMPTED').toUpperCase(),
            reasons_json: JSON.stringify(this.normalizeReasons(ans.reasons || ans.reason_ids, reasonMap)),
            remark: String(ans.remarks || ans.remark || '').trim(),
            before_photo_url: photoUrl,
            after_photo_url: afterPhotoUrl,
            has_before_photo: !!photoUrl,
            has_after_photo: !!afterPhotoUrl,
            resolved: !!ans.resolved
        };
    }

    normalizeReasons(raw, reasonMap) {
        if (!raw) return [];
        let items = [];
        if (Array.isArray(raw)) {
            items = raw;
        } else if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                items = Array.isArray(parsed) ? parsed : [raw];
            } catch (e) {
                if (raw.includes(',')) {
                    items = raw.split(',').map(v => v.trim());
                } else {
                    items = [raw.trim()];
                }
            }
        } else {
            items = [raw];
        }

        // Convert IDs into readable names, or keep existing strings
        return items.map(val => {
            if (!val) return null;
            const id = parseInt(val);
            if (!isNaN(id) && reasonMap && reasonMap[id]) {
                return reasonMap[id];
            }
            return String(val).trim();
        }).filter(v => v);
    }
}

module.exports = new ReportingProjectionService();
