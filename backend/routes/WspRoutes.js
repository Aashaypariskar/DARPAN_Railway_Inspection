const express = require('express');
const router = express.Router();
const controller = require('../controllers/WspController');
const { verifyToken } = require('../middleware/auth');

const { authorizeRoles } = require('../middleware/auth');
// Coach Management
router.get('/coaches', verifyToken, controller.listCoaches);
router.post('/coaches', verifyToken, authorizeRoles('Admin', 'SUPER_ADMIN'), controller.createCoach);
router.delete('/coaches/:id', verifyToken, authorizeRoles('Admin', 'SUPER_ADMIN'), controller.deleteCoach);

router.get('/session', verifyToken, controller.getOrCreateSession);
router.get('/schedules', verifyToken, controller.getSchedules);
router.get('/questions', verifyToken, controller.getQuestions);
router.post('/save', verifyToken, controller.saveAnswers);
router.get('/answers', verifyToken, controller.getAnswers);
router.get('/progress', verifyToken, controller.getProgress);
router.post('/submit', verifyToken, controller.submitSession);

module.exports = router;
