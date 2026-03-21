const express = require('express');
const router = express.Router();
const controller = require('../controllers/PitLineController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.get('/trains', verifyToken, controller.getTrains);
router.post('/trains/add', verifyToken, authorizeRoles('Admin', 'SUPER_ADMIN'), controller.createTrain);
router.delete('/trains/:id', verifyToken, authorizeRoles('Admin', 'SUPER_ADMIN'), controller.deleteTrain);

router.get('/coaches', verifyToken, controller.getCoaches);
router.post('/coaches/add', verifyToken, authorizeRoles('Admin', 'SUPER_ADMIN'), controller.addCoach);
router.put('/coaches/:id', verifyToken, authorizeRoles('Admin', 'SUPER_ADMIN'), controller.updateCoach);
router.delete('/coaches/:id', verifyToken, authorizeRoles('Admin', 'SUPER_ADMIN'), controller.deleteCoach);


router.post('/session/start', verifyToken, controller.startSession);
router.post('/session/submit', verifyToken, controller.submitSession);
router.get('/session/wsp-status', verifyToken, controller.getWspStatus);
router.get('/train/:id/progress', verifyToken, controller.getTrainProgress);

module.exports = router;
