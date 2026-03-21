const express = require('express');
const router = express.Router();
const controller = require('../controllers/CommissionaryController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const upload = require('../middleware/upload');

// Coach Management
router.get('/coaches', verifyToken, controller.listCoaches);
router.post('/coaches', verifyToken, authorizeRoles('Admin', 'SUPER_ADMIN'), controller.createCoach);
router.delete('/coaches/:id', verifyToken, authorizeRoles('Admin', 'SUPER_ADMIN'), controller.deleteCoach);

router.get('/session', verifyToken, controller.getOrCreateSession);
router.get('/questions', verifyToken, controller.getQuestions);
router.get('/seed-reasons', controller.seedReasons);
router.get('/answers', verifyToken, controller.getAnswers);
router.post('/save', verifyToken, (req, res, next) => {
    console.log(`[DEBUG] POST /save - Request received from ${req.ip}`);
    upload.single('photo')(req, res, (err) => {
        if (err) {
            console.error('[MULTER ERROR] Post /save:', err);
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        next();
    });
}, controller.saveAnswers);
router.get('/progress', verifyToken, controller.getProgress);
router.post('/complete', verifyToken, controller.completeSession);
router.post('/submit', verifyToken, controller.submitSession);
router.get('/combined-report', verifyToken, controller.getCombinedReport);

module.exports = router;
