const {
    PitLineSession, WspSession, CommissionarySession, SickLineSession, CaiSession
} = require('../models');
const ReportingProjectionService = require('./ReportingProjectionService');

class SessionStatusService {

    /**
     * Centralized status update with non-blocking projection trigger.
     */
    async updateStatus(sessionId, moduleType, newStatus) {
        try {
            console.log(`--- Updating Status: ${sessionId} (${moduleType}) -> ${newStatus} ---`);
            const SessionResolutionService = require('./SessionResolutionService');

            // 1. Resolve Session instance accurately
            const session = await SessionResolutionService.resolveSession(sessionId, moduleType);
            if (!session) {
                throw new Error(`Session ${sessionId} not found for status update`);
            }

            // 2. Persist status to operational DB (CRITICAL)
            const updateData = { status: newStatus };
            if (newStatus === 'SUBMITTED') {
                updateData.submitted_at = new Date();
            } else if (newStatus === 'CLOSED') {
                updateData.closed_at = new Date();
            }

            await session.update(updateData);

            // 3. Trigger Reporting Projection (ASYNCHRONOUS / NON-BLOCKING via setImmediate)
            setImmediate(() => {
                ReportingProjectionService.projectSession(sessionId, moduleType)
                    .catch(err => {
                        console.error(`--- Async Projection Failure [${moduleType}:${sessionId}]:`, err);
                    });
            });

            return true;
        } catch (err) {
            console.error(`--- Status Update Failure [${moduleType}:${sessionId}]:`, err);
            throw err; // Operational failures should be handled by controllers
        }
    }
}

module.exports = new SessionStatusService();
