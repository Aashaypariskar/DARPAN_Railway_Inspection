
const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');
const SessionReportService = require('./services/SessionReportService');

async function compareOutputs(reportingId) {
    try {
        const service = new SessionReportService();
        
        // 1. Get Session JSON (Report Details)
        // We need to know the moduleType. From previous check, ID=3 is likely SICKLINE (ID=2 was SICKLINE).
        // Let's check reporting_session ID=3
        const [session] = await sequelize.query(
            "SELECT id, module_type FROM reporting_sessions WHERE id = :reportingId",
            { replacements: { reportingId }, type: QueryTypes.SELECT }
        );
        
        if (!session) {
            console.log("Session not found");
            return;
        }
        
        const detail = await service.getSessionDetail(session.id, session.module_type);
        const defectsFromService = await service.getSessionDefects(session.id);
        
        console.log(`--- COMPARISON FOR REPORTING ID ${reportingId} (${session.module_type}) ---`);
        
        // Find a deficiency in the detail
        const deficiencyInDetail = detail.sections.flatMap(s => s.questions).find(q => q.status === 'DEFICIENCY');
        
        console.log('Question in Detail View:');
        console.log(JSON.stringify(deficiencyInDetail, null, 2));
        
        console.log('\nQuestion in Defects Modal View:');
        console.log(JSON.stringify(defectsFromService[0], null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

compareOutputs(process.argv[2] || '3');
