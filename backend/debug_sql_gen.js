const { sequelize } = require('./models');
const { QueryTypes } = require('sequelize');
const MonitoringQueryService = require('./services/MonitoringQueryService');

async function debug() {
    // We override sequelize.query to just see the params
    const originalQuery = sequelize.query;
    sequelize.query = (sql, options) => {
        console.log("--- GENERATED SQL ---");
        console.log(sql);
        console.log("--- OPTIONS ---");
        console.log(JSON.stringify(options, null, 2));
        return Promise.resolve([]);
    };

    try {
        await MonitoringQueryService.getUnifiedSessions(1, 10, {});
    } catch (err) {
        console.error("GENERATE ERROR:", err);
    } finally {
        sequelize.query = originalQuery;
    }
}

debug();
