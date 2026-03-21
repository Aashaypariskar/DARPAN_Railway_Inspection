const SessionReportService = require('./services/SessionReportService');
const { sequelize } = require('./models');

async function verifyFix(reportId) {
    try {
        const service = new SessionReportService();
        console.log(`[VERIFY] Testing getSessionDetail for Reporting ID: ${reportId} (which has user_id=0)`);
        
        const report = await service.getSessionDetail(reportId, 'PITLINE');
        
        if (report) {
            console.log('[VERIFY] SUCCESS: Report retrieved successfully!');
            console.log('[VERIFY] Inspector Name:', report.sessionInfo.inspector);
            console.log('[VERIFY] Section Count:', report.sections.length);
        } else {
            console.log('[VERIFY] FAILURE: Report still returned null.');
        }

    } catch (err) {
        console.error('[VERIFY ERROR]', err);
    } finally {
        await sequelize.close();
    }
}

const rid = process.argv[2] || 67;
verifyFix(rid);
