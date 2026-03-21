const express = require('express');
const router = express.Router();
const reasonController = require('../controllers/ReasonController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');


// Public route (authenticated users can view reasons)
router.get('/reasons', verifyToken, reasonController.getReasonsByQuestion);

// Admin-only routes
router.post('/admin/reason', verifyToken, authorizeRoles('Admin'), reasonController.createReason);
router.put('/admin/reason/:id', verifyToken, authorizeRoles('Admin'), reasonController.updateReason);
router.delete('/admin/reason/:id', verifyToken, authorizeRoles('Admin'), reasonController.deleteReason);

module.exports = router;
