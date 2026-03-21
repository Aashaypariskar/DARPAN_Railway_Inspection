
const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');
const SessionReportService = require('./services/SessionReportService');

async function testDetail(reportingId) {
    try {
        const service = new SessionReportService();
        const [session] = await sequelize.query(
            "SELECT id, module_type FROM reporting_sessions WHERE id = :reportingId",
            { replacements: { reportingId }, type: QueryTypes.SELECT }
        );
        const detail = await service.getSessionDetail(session.id, session.module_type);
        console.log(JSON.stringify(detail.sections[0].questions[0], null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

testDetail(process.argv[2] || '3');
