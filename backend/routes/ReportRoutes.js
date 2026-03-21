const express = require('express');
const router = express.Router();
const reportController = require('../controllers/ReportController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

/**
 * Report Routes
 * All endpoints are restricted to Admin role for production safety.
 */

// Production Reporting Endpoints
router.get('/reports/summary', verifyToken, authorizeRoles('Admin'), reportController.getSummary);
router.get('/reports/inspectors', verifyToken, authorizeRoles('Admin'), reportController.getInspectors);
router.get('/reports/assets', verifyToken, authorizeRoles('Admin'), reportController.getAssets);
router.get('/reports/defect-aging', verifyToken, authorizeRoles('Admin'), reportController.getAging);
router.get('/reports/repeated', verifyToken, authorizeRoles('Admin'), reportController.getRepeated);
router.get('/reports/recent', verifyToken, authorizeRoles('Admin'), reportController.getRecent);
router.get('/reports/export', verifyToken, authorizeRoles('Admin'), reportController.exportReport);
router.get('/reports/export/csv', verifyToken, authorizeRoles('Admin'), reportController.exportCSV);
router.get('/reports/export/excel', verifyToken, authorizeRoles('Admin'), reportController.exportExcel);

router.get('/reports/strategic-dashboard', verifyToken, authorizeRoles('Admin'), reportController.getStrategicDashboard);

// Missing Mobile App Endpoints
router.get('/report-filters', verifyToken, reportController.getMobileReportFilters);
router.get('/reports', verifyToken, reportController.getMobileReports);
router.get('/report-details', verifyToken, reportController.getReportDetails);
router.get('/reports/combined', verifyToken, reportController.getMobileReports); // Fallback to list for now based on app logic

module.exports = router;
