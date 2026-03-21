const queryService = require('../services/MonitoringQueryService');

/**
 * MonitoringController - Handles monitoring API requests with filtering
 */

exports.getSummary = async (req, res) => {
    try {
        const stats = await queryService.getSummaryStats();
        res.json(stats);
    } catch (err) {
        console.error('Monitoring Summary Error:', err);
        res.status(500).json({ error: 'Failed to fetch monitoring summary' });
    }
};

exports.getSessions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            module: req.query.module,
            inspector: req.query.inspector,
            status: req.query.status
        };

        const sessions = await queryService.getUnifiedSessions(page, limit, filters);
        res.json(sessions);
    } catch (err) {
        console.error('Monitoring Sessions Error:', err);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
};

exports.getDefects = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            module: req.query.module,
            inspector: req.query.inspector,
            status: req.query.status
        };

        const defects = await queryService.getUnifiedDefects(page, limit, filters);
        res.json(defects);
    } catch (err) {
        console.error('Monitoring Defects Error:', err);
        res.status(500).json({ error: 'Failed to fetch defects' });
    }
};
