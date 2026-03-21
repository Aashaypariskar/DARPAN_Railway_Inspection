const express = require('express');
const router = express.Router();
const adminController = require('../controllers/AdminController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const { standardAdminLimiter, highRiskAdminLimiter } = require('../middleware/rateLimiter');

// All routes here are protected and Admin-only
router.use(verifyToken);
router.use(authorizeRoles('Admin'));

// User Management
router.get('/users', standardAdminLimiter, adminController.getUsers);
router.post('/create-user', highRiskAdminLimiter, adminController.createUser);
router.put('/user/:id', standardAdminLimiter, adminController.updateUser);
router.delete('/user/:id', highRiskAdminLimiter, adminController.deleteUser);
router.delete('/user/:id/permanent', highRiskAdminLimiter, adminController.permanentDeleteUser);
router.put('/user/:id/reset-password', highRiskAdminLimiter, adminController.resetUserPassword);
router.put('/user-categories/:id', standardAdminLimiter, adminController.updateUserCategories);

// Metadata & Audit
router.get('/metadata', standardAdminLimiter, adminController.getFormMetadata);
router.get('/audit-logs', standardAdminLimiter, adminController.getAuditLogs);

module.exports = router;
