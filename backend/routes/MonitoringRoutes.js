const express = require('express');
const router = express.Router();
const controller = require('../controllers/MonitoringController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Monitoring layer - Admin Only
router.get('/summary', verifyToken, authorizeRoles('Admin'), controller.getSummary);
router.get('/sessions', verifyToken, authorizeRoles('Admin'), controller.getSessions);
router.get('/defects', verifyToken, authorizeRoles('Admin'), controller.getDefects);

module.exports = router;
