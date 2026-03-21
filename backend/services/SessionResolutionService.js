const {
    PitLineSession,
    CommissionarySession,
    SickLineSession,
    CaiSession,
    WspSession
} = require('../models');

/**
 * SessionResolutionService
 * Provides centralized session lookup logic with cross-table fallback capabilities.
 */
class SessionResolutionService {
    constructor() {
        /**
         * Mapping of module types to their primary session models.
         * AMENITY and UNDERGEAR share the CommissionarySession structure.
         */
        this.moduleSessionMap = {
            'PITLINE': PitLineSession,
            'PITLINE_WSP': PitLineSession,
            'SICKLINE': SickLineSession,
            'CAI': CaiSession,
            'COMMISSIONARY': CommissionarySession,
            'AMENITY': CommissionarySession,
            'UNDERGEAR': CommissionarySession,
            'WSP': WspSession
        };
    }

    /**
     * Resolves a session by ID and module type.
     * Searches module-specific table first, then falls back to all known session tables.
     * 
     * @param {string|number} session_id The unique identifier for the session
     * @param {string} module_type The module type (e.g., PITLINE, WSP, AMENITY)
     * @returns {Promise<Object|null>} The Sequelize session instance or null
     */
    async resolveSession(session_id, module_type) {
        if (!session_id) {
            console.warn('[SESSION-RESOLVER] Missing session_id');
            return null;
        }

        const type = (module_type || '').toUpperCase();
        console.log(`[SESSION-RESOLVER] Resolving session_id:${session_id} for module:${type}`);

        // 1. Module-Specific lookup (Priority) using configuration map
        let session = null;
        const PrimaryModel = this.moduleSessionMap[type];

        if (PrimaryModel) {
            try {
                session = await PrimaryModel.findByPk(session_id);
                if (session) {
                    console.log(`[SESSION-RESOLVER] Found in primary table (${PrimaryModel.name}) for ${type}: ${session_id}`);
                    return session;
                }
            } catch (err) {
                console.error(`[SESSION-RESOLVER] Primary lookup error for ${type}/${session_id}:`, err.message);
            }
        }

        // 2. Strict Isolation: No cross-table fallbacks for most modules to prevent ID collisions and FK violations.
        // Fallback is only allowed for legacy modules if absolutely necessary.
        const strictModules = ['SICKLINE', 'CAI', 'COMMISSIONARY', 'AMENITY', 'UNDERGEAR', 'WSP', 'PITLINE'];
        if (strictModules.includes(type)) {
            console.warn(`[SESSION-RESOLVER] Session ${session_id} NOT FOUND in primary table for isolated module: ${type}`);
            return null;
        }

        // 3. Optional Cross-Table Fallback (Legacy/Emergency only)
        const fallbackModels = [
            PitLineSession,
            CommissionarySession,
            SickLineSession,
            CaiSession,
            WspSession
        ];

        for (const Model of fallbackModels) {
            try {
                session = await Model.findByPk(session_id);
                if (session) {
                    console.log(`[SESSION-RESOLVER] Fallback found in ${Model.name}: ${session_id}`);
                    return session;
                }
            } catch (err) {
                console.error(`[SESSION-RESOLVER] Fallback lookup error in ${Model.name} for session_id:${session_id}:`, err.message);
            }
        }

        console.warn(`[SESSION-RESOLVER] CRITICAL: Session ${session_id} NOT FOUND in any known table`);
        return null;
    }
}

module.exports = new SessionResolutionService();
