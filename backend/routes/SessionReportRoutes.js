const express = require('express');
const router = express.Router();
const SessionReportController = require('../controllers/SessionReportController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

/**
 * Session-Level Reporting Routes
 * Restricted to Admin/Authenticated access.
 */

router.get('/session/:sessionId',
    verifyToken,
    SessionReportController.getSessionJSON
);

router.get('/session/:sessionId/export',
    verifyToken,
    SessionReportController.exportSessionPDF
);

router.get('/session/:reportingId/defects',
    verifyToken,
    SessionReportController.getSessionDefects
);

module.exports = router;
