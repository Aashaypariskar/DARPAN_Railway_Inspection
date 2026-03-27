const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // We always use the base uploadDir for destination. 
        // The subfolder logic is intentionally handled in the filename function
        // so that `req.file.filename` seamlessly includes the relative sub-path.
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        try {
            // 1. Extract hierarchy parameters from body or query securely
            const moduleType = (req.body && req.body.module_type) || (req.query && req.query.module_type);
            const sessionId = (req.body && req.body.session_id) || (req.query && req.query.session_id) || 'NO_SESSION';
            const imageStage = (req.body && req.body.image_stage) || (req.query && req.query.image_stage) || 'before';
            const questionId = (req.body && req.body.question_id) || (req.query && req.query.question_id);

            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const originalName = file && file.originalname ? file.originalname : 'photo.jpg';
            const ext = path.extname(originalName);

            let finalFilename = '';
            
            // 2. Generate filename based on question ID presence
            if (questionId) {
                finalFilename = `Q${questionId}_${uniqueSuffix}${ext}`;
            } else {
                const originalBase = path.parse(originalName).name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const fieldName = file && file.fieldname ? file.fieldname : 'file';
                finalFilename = `${fieldName}-${originalBase}-${uniqueSuffix}${ext}`;
            }

            // 3. Implement target folder structure if we have a module context
            if (moduleType) {
                // Sanitize user inputs heavily to prevent path traversal
                const safeModuleType = String(moduleType).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                const safeSessionId = String(sessionId).replace(/[^a-zA-Z0-9]/g, '_');
                const safeImageStage = String(imageStage).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                
                const date = new Date().toISOString().split('T')[0];
                const sessionFolder = `session_${safeSessionId}_${date}`;
                
                // Build disk path for mkdir
                const dynamicPath = path.join(uploadDir, safeModuleType, sessionFolder, safeImageStage);
                if (!fs.existsSync(dynamicPath)) {
                    fs.mkdirSync(dynamicPath, { recursive: true });
                }
                
                // Return POSIX-style relative path. Multer will append this to destination.
                // This guarantees `req.file.filename` includes the `/PITLINE/...` portion 
                // so existing server logic (toAbsoluteUrl) continues working without any edits!
                const posixSubPath = `${safeModuleType}/${sessionFolder}/${safeImageStage}/${finalFilename}`;
                return cb(null, posixSubPath);
            }

            // Fallback for older or generic file uploads
            cb(null, finalFilename);
        } catch (err) {
            console.error('[UPLOAD ERROR] Core hierarchy failure. Falling back to default:', err);
            const fallbackSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const originalName = file && file.originalname ? file.originalname : 'photo.jpg';
            const ext = path.extname(originalName);
            cb(null, `fallback-${fallbackSuffix}${ext}`);
        }
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Error: File upload only supports the following filetypes - " + filetypes));
    }
});

module.exports = upload;
module.exports.storage = storage;
