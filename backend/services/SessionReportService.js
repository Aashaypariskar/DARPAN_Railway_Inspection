const {
    sequelize,
    User
} = require('../models');
const { QueryTypes } = require('sequelize');

const BASE_URL = process.env.BASE_URL || 'http://192.168.1.4:8080';

const toAbsoluteUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}/${path.replace(/^\/+/, '')}`;
};

/**
 * Session Report Service - PROJECTION LAYER EDITION
 * Unified READ-ONLY access to session data across all modules via projection tables.
 */
class SessionReportService {

    /**
     * Detect module_type for a given source sessionId using projection.
     */
    async detectSessionModule(sessionId) {
        const results = await sequelize.query(`
            SELECT module_type FROM reporting_sessions 
            WHERE source_session_id = :sessionId 
            LIMIT 1
        `, {
            replacements: { sessionId },
            type: QueryTypes.SELECT
        });
        return results.length > 0 ? results[0].module_type : null;
    }

    /**
     * Fetch complete session details from projection tables.
     */
    async getSessionDetail(sessionId, moduleType) {
        // 1. Fetch Reporting Session joined with User metadata
        const sessionResults = await sequelize.query(`
            SELECT 
                rs.*,
                u.name as inspector_name
            FROM reporting_sessions rs
            LEFT JOIN users u ON rs.user_id = u.id
            WHERE rs.id = :sessionId
            LIMIT 1
        `, {
            replacements: { sessionId },
            type: QueryTypes.SELECT
        });

        if (sessionResults.length === 0) return null;
        const sessionData = sessionResults[0];

        // 2. Fetch Answers with Activity context joined from Master layer
        const answers = await sequelize.query(`
            SELECT 
                ra.*,
                COALESCE(act.type, 'General') as activity_type
            FROM reporting_answers ra
            LEFT JOIN questions q ON ra.source_question_id = q.id
            LEFT JOIN activities act ON q.activity_id = act.id
            WHERE ra.reporting_session_id = :reportSessionId
            ORDER BY ra.id ASC
        `, {
            replacements: { reportSessionId: sessionData.id },
            type: QueryTypes.SELECT
        });

        const { FINALIZED_STATUSES } = require('./ReportConstants');
        const sessionStatus = String(sessionData.status || 'DRAFT').toUpperCase();
        const isFinalized = FINALIZED_STATUSES.includes(sessionStatus);

        const sessionInfo = {
            reportingId: sessionData.id,
            sessionId: sessionData.source_session_id,
            module: sessionData.module_type,
            inspector: sessionData.inspector_name || 'Unknown Inspector',
            assetOrCoach: sessionData.asset_id || 'N/A',
            status: sessionStatus,
            inspectionDate: sessionData.inspection_datetime || new Date().toISOString()
        };

        let okCount = 0;
        let deficiencyCount = 0;

        // 3. Deduplication (source_question_id + reporting_session_id)
        const uniqueAnswersMap = new Map();
        answers.forEach(ans => {
            const key = `${ans.source_question_id}-${ans.reporting_session_id}`;
            if (!uniqueAnswersMap.has(key)) {
                uniqueAnswersMap.set(key, ans);
            }
        });

        const uniqueAnswers = Array.from(uniqueAnswersMap.values());

        const normalizedAnswers = uniqueAnswers.map(ans => {
            const resolvedReasons = this.parseReasons(ans.reasons_json);
            const currStatus = String(ans.answer_status || 'OK').toUpperCase();

            if (currStatus === 'DEFICIENCY') deficiencyCount++;
            else if (currStatus === 'OK') okCount++;

            return {
                id: ans.id,
                questionText: String(ans.question_text || 'Unknown Question'),
                status: currStatus,
                reasons: Array.isArray(resolvedReasons) ? resolvedReasons : [],
                remark: String(ans.remark || '').trim(),
                beforeImage: toAbsoluteUrl(ans.before_photo_url) || null,
                afterImage: toAbsoluteUrl(ans.after_photo_url) || null,
                section: String(ans.section_title || 'General'),
                activity: String(ans.activity_type || 'General'),
                resolved: !!ans.resolved,
                updatedAt: ans.updated_at
            };
        });

        // 4. Build Hierarchical Map (Area -> Activity -> Questions)
        const hierarchyMap = {};
        normalizedAnswers.forEach(ans => {
            const area = ans.section;
            const activity = ans.activity;

            if (!hierarchyMap[area]) {
                hierarchyMap[area] = { title: area, activities: {} };
            }
            if (!hierarchyMap[area].activities[activity]) {
                hierarchyMap[area].activities[activity] = { title: activity, questions: [] };
            }
            hierarchyMap[area].activities[activity].questions.push(ans);
        });

        // Convert nested map to nested array
        const hierarchicalSections = Object.values(hierarchyMap).map(area => ({
            title: area.title,
            activities: Object.values(area.activities)
        }));

        const totalQuestions = sessionData.total_master_questions || sessionData.total_questions || 0;
        const attemptedCount = sessionData.attempted_count || okCount + deficiencyCount;
        let notAttemptedCount = totalQuestions - attemptedCount;
        if (notAttemptedCount < 0) notAttemptedCount = 0;

        let compliancePercentage = sessionData.compliance_score !== null ? parseFloat(sessionData.compliance_score) : null;
        let progressPercentage = sessionData.progress_percentage !== null ? parseFloat(sessionData.progress_percentage) : null;
        let message = null;

        if (!isFinalized) {
            compliancePercentage = null;
            message = "Inspection in progress – Compliance not calculated";
        }

        const summary = {
            status: sessionStatus,
            isFinalized,
            totalQuestions,
            attemptedCount,
            okCount,
            deficiencyCount,
            notAttemptedCount,
            progressPercentage,
            compliancePercentage,
            message
        };

        return {
            sessionInfo,
            summary,
            sections: hierarchicalSections,
            generatedAt: new Date().toISOString()
        };
    }

    parseReasons(reasons) {
        if (!reasons) return [];
        if (Array.isArray(reasons)) return reasons;
        if (typeof reasons === 'string') {
            try {
                const json = JSON.parse(reasons);
                return Array.isArray(json) ? json : [];
            } catch (e) {
                return [];
            }
        }
        return [];
    }

    /**
     * Fetch only defects for a given reporting session.
     */
    async getSessionDefects(reportingId) {
        const sql = `
            SELECT 
                ra.section_title,
                ra.question_text,
                ra.answer_status,
                ra.remark,
                ra.before_photo_url,
                ra.after_photo_url,
                q.display_order
            FROM reporting_answers ra
            LEFT JOIN questions q ON ra.source_question_id = q.id
            WHERE ra.reporting_session_id = :reportingId
              AND ra.answer_status = 'DEFICIENCY'
            ORDER BY ra.section_title, q.display_order ASC, ra.id ASC
        `;

        return await sequelize.query(sql, {
            replacements: { reportingId },
            type: QueryTypes.SELECT
        });
    }
}

module.exports = SessionReportService;
