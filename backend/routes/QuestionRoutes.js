const express = require('express');
const router = express.Router();
const questionController = require('../controllers/QuestionController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Public route (authenticated users can view questions)
router.get('/questions', verifyToken, questionController.getQuestionsByActivity);

// Admin-only routes
router.post('/admin/question', verifyToken, authorizeRoles('Admin'), questionController.createQuestion);
router.put('/admin/question/:id', verifyToken, authorizeRoles('Admin'), questionController.updateQuestion);
router.delete('/admin/question/:id', verifyToken, authorizeRoles('Admin'), questionController.deleteQuestion);

module.exports = router;
