/**
 * answerHelpers.js
 * Basic atomic helpers for answer state and identification.
 * This is a leaf utility to prevent circular dependencies.
 */

/**
 * getQuestionId
 * Canonical identifier getter - enforces question_id as primary key.
 */
export const getQuestionId = (q) => {
    if (!q) return null;
    return (q.question_id || q.id)?.toString();
};

/**
 * isStatusAnswered
 * Checks if a status-type question has a valid selection.
 */
export const isStatusAnswered = (answer) => {
    return answer && answer.status !== null && answer.status !== undefined;
};

/**
 * isValueAnswered
 * Checks if a value-type question has a valid numeric or text entry.
 */
export const isValueAnswered = (answer) => {
    return answer && 
           answer.observed_value !== null && 
           answer.observed_value !== undefined && 
           answer.observed_value !== "";
};

/**
 * isQuestionAnswered
 * Universal check for whether a question has been answered based on its type.
 */
export const isQuestionAnswered = (question, answer) => {
    if (!question || !answer) return false;
    
    // Check by answer_type or detection of fields
    if (question.answer_type === 'VALUE' || (answer.observed_value !== undefined && answer.observed_value !== null)) {
        return isValueAnswered(answer);
    }
    
    return isStatusAnswered(answer);
};