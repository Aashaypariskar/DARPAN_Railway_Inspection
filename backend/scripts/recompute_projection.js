const { sequelize, PitLineSession, WspSession, CommissionarySession, SickLineSession, CaiSession } = require('../models');
const ReportingProjectionService = require('../services/ReportingProjectionService');

async function runBackfill() {
    console.log('[BACKFILL] Starting Projection Integrity Refresh...');
    try {
        let totalProcessed = 0;

        const processModule = async (Model, moduleType) => {
            const sessions = await Model.findAll({ attributes: ['id'] });
            console.log(`[BACKFILL] Found ${sessions.length} sessions for ${moduleType}`);
            for (const session of sessions) {
                try {
                    await ReportingProjectionService.projectSession(session.id, moduleType);
                    totalProcessed++;
                    await new Promise(resolve => setTimeout(resolve, 1500));
                } catch (e) {
                    console.error(`[BACKFILL ERROR] Session ${session.id} (${moduleType}):`, e.message);
                }
            }
        };

        await processModule(PitLineSession, 'PITLINE');
        await processModule(WspSession, 'WSP');
        await processModule(CommissionarySession, 'COMMISSIONARY');
        await processModule(SickLineSession, 'SICKLINE');
        await processModule(CaiSession, 'CAI');

        console.log(`[BACKFILL SUCCESS] Projected Integrity Refresh complete. Processed ${totalProcessed} sessions.`);
        process.exit(0);
    } catch (err) {
        console.error('[BACKFILL FATAL]', err);
        process.exit(1);
    }
}

runBackfill();
