const { Question, CaiQuestion, AmenityItem, LtrSchedule } = require('../models');

/**
 * QuestionRegistryService
 * Centralizes the logic for determining "Total Active Questions" per module/category.
 */
class QuestionRegistryService {
    /**
     * Get the total expected questions for a specific session/module context.
     * @param {string} moduleType - PITLINE, COMMISSIONARY, SICKLINE, WSP, CAI
     * @param {object} context - Metadata like subcategory_id, schedule_id, etc.
     */
    static async getTotalQuestions(moduleType, context = {}) {
        const type = moduleType.toUpperCase();
        const { subcategory_id, schedule_id } = context;

        try {
            if (type === 'CAI') {
                return await CaiQuestion.count({ where: { is_active: true } });
            }

            if (type === 'PITLINE') {
                // Pitline typically expects 100 as per legacy, but we'll try to count dynamically
                // If it's area-based (undergear), we count those questions
                const count = await Question.count({ 
                    where: { 
                        [Op?.or || 'or']: [
                            { category: 'Undergear' },
                            { subcategory_id: subcategory_id || null }
                        ],
                        is_active: 1 
                    } 
                });
                return count > 0 ? count : 100; // Fallback to 100 for safety
            }

            if (type === 'COMMISSIONARY' || type === 'AMENITY') {
                if (!subcategory_id) {
                    // Global total for the module sum (8 areas ~200 questions)
                    return 208; 
                }
                // Commissionary/Amenity has Major/Minor items
                return await Question.count({
                    where: { subcategory_id, is_active: 1 }
                });
            }

            if (type === 'WSP') {
                if (schedule_id) {
                    return await Question.count({ where: { schedule_id, is_active: 1 } });
                }
                return await Question.count({ where: { schedule_id: { [Op?.not || 'not']: null }, is_active: 1 } });
            }

            if (type === 'SICKLINE') {
                return await Question.count({
                    where: { section_code: 'SS1-C', ss1_flag: 'C', is_active: 1 }
                });
            }

            return 0;
        } catch (err) {
            console.error(`[QuestionRegistryService] Error resolving count for ${type}:`, err.message);
            // Absolute fallbacks to prevent division by zero in reporting
            const fallbacks = { CAI: 120, PITLINE: 100, COMMISSIONARY: 154, WSP: 25, SICKLINE: 48 };
            return fallbacks[type] || 0;
        }
    }
}

const { Op } = require('sequelize');
module.exports = QuestionRegistryService;
