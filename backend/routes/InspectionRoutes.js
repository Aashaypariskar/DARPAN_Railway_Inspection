const express = require("express");
const multer = require("multer");
const router = express.Router();
const InspectionController = require("../controllers/InspectionController");

// Simplified multer for resolution images
const upload = multer({ dest: "uploads/resolutions/" });

/**
 * @route   POST /api/inspection/resolve
 * @desc    Resolve a defect with an optional "After Photo"
 * @access  Private (verifyToken middleware in server.js or explicitly here)
 */
router.post(
    "/resolve",
    upload.single("photo"),
    InspectionController.resolveDefect
);

router.get(
    "/progress",
    InspectionController.getProgress
);

router.get(
    "/defects",
    InspectionController.getPendingDefects
);

router.get(
    "/answers",
    InspectionController.getAnswers
);

module.exports = router;
