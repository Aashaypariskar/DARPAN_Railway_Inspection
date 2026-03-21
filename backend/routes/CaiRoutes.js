const express = require('express');
const router = express.Router();
const caiController = require('../controllers/CaiController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
console.log('--- CAI ROUTES LOADED ---');

router.use((req, res, next) => {
    console.log(`[CAI ROUTER] Hit: ${req.method} ${req.url}`);
    next();
});

router.get('/questions', verifyToken, caiController.getQuestions);
router.get('/answers', verifyToken, caiController.getAnswers);
router.get('/progress', verifyToken, caiController.getProgress);
router.post('/session/start', verifyToken, caiController.startSession);
router.post('/submit', verifyToken, caiController.submitSession);

// Coach Management
router.get('/coaches', verifyToken, caiController.listCoaches);
router.post('/coaches', verifyToken, authorizeRoles('Admin', 'SUPER_ADMIN'), caiController.createCoach);
router.delete('/coaches/:id', verifyToken, authorizeRoles('Admin', 'SUPER_ADMIN'), caiController.deleteCoach);

// Admin routes
router.post('/questions/add', verifyToken, authorizeRoles('Admin'), caiController.addQuestion);
router.post('/questions/update', verifyToken, authorizeRoles('Admin'), caiController.updateQuestion);

module.exports = router;
