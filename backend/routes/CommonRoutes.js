const express = require('express');
const router = express.Router();
const commonController = require('../controllers/CommonController');
const auth = require('../middleware/auth');

router.get('/subcategory-metadata', auth.verifyToken, commonController.getSubcategoryMetadata);

module.exports = router;
