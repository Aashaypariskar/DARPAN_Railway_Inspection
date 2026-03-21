import { Alert } from 'react-native';
import api from '../api/api';
import { getQuestionId } from './answerHelpers';
import { buildAnswerContext } from './answerKeyUtils';

/**
 * bulkMarkQuestionsOk
 * Utility for marking multiple questions as OK at once.
 */
export const bulkMarkQuestionsOk = async ({
    questions,
    currentAnswers,
    getAnswerKey,
    setDraft,
    moduleType,
    sessionId,
    extraParams = {},
    setIsProcessing
}) => {
    console.log("=== bulkMarkQuestionsOk STARTED ===");
    console.log("Params:", { questionsCount: questions?.length, moduleType, sessionId });

    // Filter for truly unanswered questions
    const unanswered = questions.filter(q => {
        if (q.answer_type === 'VALUE') return false;
        const key = getAnswerKey(q);
        const ans = currentAnswers[key];
        return !ans || (ans.status === null || ans.status === undefined);
    });

    console.log("Unanswered questions:", unanswered.length);

    if (unanswered.length === 0) {
        Alert.alert('Info', 'All questions are already answered.');
        return;
    }

    try {
        if (setIsProcessing) setIsProcessing(true);
        console.log("[BULK] Starting actual save");

        const BATCH_SIZE = 25;
        const allUpdates = unanswered
            .map(q => {
                const numericId = parseInt(getQuestionId(q), 10);
                return {
                    ...buildAnswerContext(q, extraParams),
                    question_id: isNaN(numericId) ? null : numericId,
                    status: 'OK',
                    reasons: null,
                    remarks: null,
                    photo_url: null,
                    observed_value: null
                };
            })
            .filter(update => !!update.question_id); // Safety filter

        console.log("Bulk payload prepared:", allUpdates.length, "items");

        const localUpdates = {};
        unanswered.forEach(q => {
            const key = getAnswerKey(q);
            if (!key) return;
            localUpdates[key] = {
                question_id: getQuestionId(q),
                activity_type: key.split('_')[5], // Fix: Maintain explicit tab context for subsequent saves
                status: 'OK',
                reasons: null,
                remarks: null,
                photo_url: null,
                observed_value: null
            };
        });

        // Adaptively update state based on structure (flat or nested)
        setDraft(prev => {
            if (!prev) return localUpdates;
            if (prev.answers !== undefined) {
                return {
                    ...prev,
                    answers: { ...prev.answers, ...localUpdates }
                };
            }
            return { ...prev, ...localUpdates };
        });

        console.log("Optimistic update applied");

        // Real save – chunked
        const totalBatches = Math.ceil(allUpdates.length / BATCH_SIZE);

        for (let i = 0; i < totalBatches; i++) {
            const batch = allUpdates.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
            console.log(`Sending batch ${i + 1}/${totalBatches} (${batch.length} items)`);

            // DIRECT API CALL TO AVOID "NOT A FUNCTION" ERRORS
            await api.post('/inspection/save-checkpoint', {
                module_type: moduleType.toUpperCase(),
                session_id: sessionId,
                answers: batch
            });
        }

        console.log("[BULK] All batches sent successfully");

    } catch (err) {
        console.error("[BULK SAVE ERROR]:", err.message || err);
        Alert.alert('Bulk Save Failed', 'Could not save all answers. Try marking individually.');
        throw err; // Re-throw so caller knows it failed
    } finally {
        if (setIsProcessing) setIsProcessing(false);
        console.log("=== bulkMarkQuestionsOk FINISHED ===");
    }
};