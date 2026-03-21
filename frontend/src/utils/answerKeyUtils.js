/**
 * answerKeyUtils.js
 * Centralized utility for consistent answer key generation across all modules.
 * Strictly aligned with the database UNIQUE constraint:
 * (session_id, question_id, coach_id, compartment_id, subcategory_id, activity_type)
 */

import { getQuestionId } from './answerHelpers';

/**
 * buildAnswerContext
 * Canonical builder for answer context to ensure consistency across screens, 
 * bulk operations, and hydration.
 * 
 * @param {Object} item - The question or answer object.
 * @param {Object} params - Screen or navigation parameters.
 * @returns {Object} - Standardized context object.
 */
export const buildAnswerContext = (item = {}, params = {}) => {
    return {
        session_id: (item.session_id || params.session_id || params.sessionId)?.toString(),
        coach_id: item.coach_id || params.coach_id || params.coachId || 'NA',
        compartment_id: String(item.compartment_id || params.compartment_id || params.compartment || 'NA'),
        subcategory_id: Number(item.subcategory_id || params.subcategory_id || params.subcategoryId || 0) || 0,
        activity_type: String(item.activity_type || params.activity_type || params.activityType || 'Major'),
        module_type: item.module_type || params.module_type || params.type,
        schedule_id: item.schedule_id || params.schedule_id || params.scheduleId || null
    };
};

/**
 * generateAnswerKey
 * Generates a unique string key for identifying an answer record.
 * 
 * @param {Object} item - The question or answer object containing identifiers.
 * @param {Object} context - The context (output of buildAnswerContext).
 * @returns {string|null} - The composite key or null if qId is missing.
 */
export const generateAnswerKey = (item, context = {}) => {
    const qId = getQuestionId(item);
    if (!qId) return null;

    // Standardize context if not already done
    const ctx = (context && context.coach_id) ? context : buildAnswerContext(item, context);

    const safe = (v) => (v === null || v === undefined ? 'NA' : v);

    const compId = safe(ctx.compartment_id);
    const schId = safe(ctx.schedule_id);
    const actType = safe(ctx.activity_type);

    // RETURN UNIFIED COMPOSITE KEY FOR ALL MODULES
    // Format: moduleType_sessionId_questionId_coachId_subcategoryId_activityType_compartmentId_scheduleId
    return `${ctx.module_type || 'PITLINE'}_${ctx.session_id || 'NA'}_${qId}_${ctx.coach_id}_${ctx.subcategory_id || 0}_${actType}_${compId}_${schId}`;
};
