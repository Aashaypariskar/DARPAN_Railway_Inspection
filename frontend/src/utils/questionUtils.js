/**
 * questionUtils.js
 * Utilities for processing question lists
 */
import { getQuestionId, isQuestionAnswered } from './answerHelpers';

export { getQuestionId, isQuestionAnswered };

/**
 * getNormalizedId
 */
export function getNormalizedId(q) {
    return q?.question_id || q?.compartment_question_id || q?.id;
}

/**
 * extractAllQuestions
 * Flattens nested question groups into a single array
 */
export function extractAllQuestions(items, parentContext = {}) {

    if (!items || !Array.isArray(items)) return [];

    let extracted = [];

    items.forEach(node => {

        const context = {
            ...parentContext,
            coach_id: node.coach_id ?? parentContext.coach_id,
            compartment_id: node.compartment_id ?? parentContext.compartment_id ?? 'NA',
            subcategory_id: node.subcategory_id ?? parentContext.subcategory_id ?? 0,
            activity_type: node.activity_type ?? parentContext.activity_type
        };

        // Case 1: node has questions
        if (Array.isArray(node.questions)) {

            const enriched = node.questions.map(q => ({
                ...context,
                ...q,
                question_id: q.question_id || q.id
            }));

            extracted.push(...enriched);
        }

        // Case 2: recursive children
        const childKeys = ['items', 'children', 'activities', 'groupedQuestions'];

        childKeys.forEach(key => {
            if (Array.isArray(node[key])) {
                extracted.push(...extractAllQuestions(node[key], context));
            }
        });

        // Case 3: node itself is question
        if (
            (node.text || node.question_text) &&
            !node.questions &&
            !node.items &&
            !node.children &&
            !node.activities
        ) {
            extracted.push({
                ...context,
                ...node,
                question_id: node.question_id || node.id
            });
        }

    });

    return extracted;
}