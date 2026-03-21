const { sequelize } = require('./models');
const MonitoringQueryService = require('./services/MonitoringQueryService');

async function debug() {
    try {
        await MonitoringQueryService.getUnifiedSessions(1, 1, {});
    } catch (err) {
        console.log("--- ERROR DETAILS ---");
        console.log("Message:", err.message);
        if (err.parent) {
            console.log("SQL:", err.parent.sql);
            console.log("Error No:", err.parent.errno);
            console.log("Error Code:", err.parent.code);
        }
    } finally {
        process.exit();
    }
}

debug();
