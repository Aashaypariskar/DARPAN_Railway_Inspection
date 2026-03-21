const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');
const MonitoringQueryService = require('./services/MonitoringQueryService');

async function verify() {
    try {
        console.log("--- Debugging getUnifiedSessions ---");
        const sessions = await MonitoringQueryService.getUnifiedSessions(1, 10, {});
        
        console.log("Result Type:", typeof sessions);
        console.log("Is Array:", Array.isArray(sessions));
        
        if (Array.isArray(sessions)) {
            console.log("Count:", sessions.length);
            if (sessions.length > 0) {
                console.log("First Row (JSON):", JSON.stringify(sessions[0], null, 2));
            }
        } else {
            console.log("Unexpected Result:", sessions);
        }

    } catch (err) {
        console.error("DEBUG ERROR:", err);
    } finally {
        process.exit();
    }
}

verify();
