/**
 * Normalizes question responses from various backend endpoints to a strict contract.
 * Also merges duplicate item_name groups to prevent repeated UI segments.
 * @param {any} response - The raw response from the API
 * @returns {object} - { totalGroups, totalQuestions, groups, supportsActivityType }
 */
export const normalizeQuestionResponse = (response) => {
    let rawGroups = [];
    let supportsActivityType = false;

    if (!response) {
        console.warn('[NORMALIZATION] Received null or undefined response');
    } else {
        // Capture supportsActivityType if available
        if (typeof response.supportsActivityType === 'boolean') {
            supportsActivityType = response.supportsActivityType;
        }

        // Pattern 1: { groupedQuestions: [...] } (Commissionary/SickLine preferred)
        if (response.groupedQuestions && Array.isArray(response.groupedQuestions)) {
            rawGroups = response.groupedQuestions;
        }
        // Pattern 2: { groups: [...] } (Standardized future-proof)
        else if (response.groups && Array.isArray(response.groups)) {
            rawGroups = response.groups;
        }
        // Pattern 3: Raw Array [...] (Legacy or direct retrieval)
        else if (Array.isArray(response)) {
            // Check if it's already an array of groups or a flat array of questions
            const isGrouped = response.length > 0 && response[0].questions && Array.isArray(response[0].questions);
            if (isGrouped) {
                rawGroups = response;
            } else {
                // If its already questions, wrap them into a default group
                rawGroups = [{ item_name: 'Checklist', questions: response }];
            }
        }
        // Pattern 4: { questions: [...] } — Flat array wrapper (Undergear / QuestionController)
        else if (response.questions && Array.isArray(response.questions)) {
            rawGroups = [{ item_name: 'Undergear', questions: response.questions }];
        }
        // Unknown Shape
        else {
            console.warn('[NORMALIZATION] Unexpected question response shape:', response);
        }
    }

    // MERGE DUPLICATE ITEM NAMES
    const map = new Map();

    rawGroups.forEach(group => {
        const key = group?.item_name || group?.item || 'UNKNOWN';

        if (!map.has(key)) {
            map.set(key, {
                item_name: key, // Standardize on item_name
                ...group,
                questions: [...(group.questions || [])]
            });
        } else {
            const existing = map.get(key);
            // Append questions to existing group
            if (Array.isArray(group.questions)) {
                existing.questions.push(...group.questions);
            }
        }
    });

    const mergedGroups = Array.from(map.values());

    // Calculate metadata
    const totalQuestions = mergedGroups.reduce(
        (acc, g) => acc + (Array.isArray(g?.questions) ? g.questions.length : 0),
        0
    );

    return {
        totalGroups: mergedGroups.length,
        totalQuestions,
        groups: mergedGroups,
        supportsActivityType: true // Always true if normalization succeeds
    };
};
