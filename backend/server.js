const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const auditRoutes = require('./routes/AuditRoutes');
const authRoutes = require('./routes/AuthRoutes');
const adminRoutes = require('./routes/AdminRoutes');
const questionRoutes = require('./routes/QuestionRoutes');
const reasonRoutes = require('./routes/ReasonRoutes');
const { verifyToken } = require('./middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const inspectionController = require('./controllers/InspectionController');

const app = express();
const PORT = process.env.PORT || 8080;

// Dynamic Base Path Handling (e.g., '/inspection' or '')
const BASE_PATH = process.env.BASE_PATH || '';
console.log(`[INIT] Using BASE_PATH: "${BASE_PATH}"`);

const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3001',
            'http://localhost:8080',
            'https://localhost:8081',
            'http://localhost:8081',
            'http://localhost:19006',
            'https://meetofy.in',
            'http://meetofy.in',
            'http://192.168.1.2:3001',
            'http://192.168.1.2:8081',
            'https://192.168.1.2:8081',
            'http://192.168.1.2:8080',
            'http://192.168.1.12:8080',
            'http://10.178.240.216:8080',
            'https://darpan.premade.in  ',
            'https://railway-inspection-181711399428.us-central1.run.app'
        ];

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Root Route ───────────────────────────────────────────────────────────────
// Serves the Dashboard Landing
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'dashboard', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.json({ status: 'Backend is running', dashboard: 'not deployed' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────

// Health check for frontend to verify reachability
app.get('/health', (req, res) => res.json({ status: 'ok', environment: process.env.NODE_ENV || 'development' }));

// Log every request
app.use((req, res, next) => {
    const start = Date.now();
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} - INCOMING`);

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });

    next();
});

// Log body after parsing for JSON requests
app.use((req, res, next) => {
    if (['POST', 'PUT'].includes(req.method) && !req.header('content-type')?.includes('multipart')) {
        console.log(' - Parsed Body:', JSON.stringify(req.body));
    }
    next();
});

app.use(`${BASE_PATH}/public`, express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/debug-uploads', (req, res) => {
    const uploadsDir = path.join(__dirname, 'uploads');
    try {
        const files = fs.readdirSync(uploadsDir);
        res.json({ uploadsDir, files });
    } catch (err) {
        res.status(500).json({ error: 'Could not read uploads directory', detail: err.message });
    }
});

// ─── Monitoring Dashboard (Static Assets) ───────────────────────────────────
// Serve the entire dashboard directory (assets, index.html, etc.) at the root
app.use(express.static(path.join(__dirname, 'public', 'dashboard'), {
    index: false,
    maxAge: '1d',
    immutable: true
}));

// Debug route
app.get('/debug-dashboard', (req, res) => {
    res.json({
        dashboardPath,
        exists: fs.existsSync(dashboardPath),
        files: fs.existsSync(dashboardPath) ? fs.readdirSync(dashboardPath) : []
    });
});
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

console.log(`--- REGISTERING ROUTES UNDER ${BASE_PATH}/api ---`);

// Routes
app.use(`${BASE_PATH}/api`, authRoutes);
app.use(`${BASE_PATH}/api`, auditRoutes);
app.use(`${BASE_PATH}/api/admin`, adminRoutes);
app.use(`${BASE_PATH}/api`, questionRoutes);
app.use(`${BASE_PATH}/api`, reasonRoutes);
app.use(`${BASE_PATH}/api`, require('./routes/ReportRoutes'));
app.use(`${BASE_PATH}/api/reports`, require('./routes/SessionReportRoutes'));
app.use(`${BASE_PATH}/api/commissionary`, require('./routes/CommissionaryRoutes'));
app.use(`${BASE_PATH}/api/sickline`, require('./routes/SickLineRoutes'));
app.use(`${BASE_PATH}/api/wsp`, require('./routes/WspRoutes'));
app.use(`${BASE_PATH}/api/pitline`, require('./routes/PitLineRoutes'));
app.use(`${BASE_PATH}/api/common`, require('./routes/CommonRoutes'));
app.use(`${BASE_PATH}/api/cai`, require('./routes/CaiRoutes'));
app.use(`${BASE_PATH}/api/monitoring`, require('./routes/MonitoringRoutes'));

app.get(`${BASE_PATH}/api/health`, (req, res) => res.json({ status: 'ok', environment: process.env.NODE_ENV || 'development' }));

const inspectionRoutes = require("./routes/InspectionRoutes");
app.use(`${BASE_PATH}/api/inspection`, inspectionRoutes);

// Inspection Lifecycle - Photo Upload for general usage
const upload = require('./middleware/upload');
const uploadAny = multer({ storage: upload.storage });

app.post(`${BASE_PATH}/api/upload-photo`, verifyToken, (req, res, next) => {
    uploadAny.single('photo')(req, res, (err) => {
        if (err) {
            console.error('[PHOTO UPLOAD ERROR] Multer error:', err.message);
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        next();
    });
}, (req, res) => {
    if (!req.file) {
        console.warn('[PHOTO UPLOAD] No file received in request');
        return res.status(400).json({ error: 'No photo uploaded' });
    }
    const photoUrl = `uploads/${req.file.filename}`;
    console.log(`[PHOTO UPLOAD] Saved: ${photoUrl} (${req.file.size} bytes, mimetype: ${req.file.mimetype})`);
    res.json({ success: true, photo_url: photoUrl });
});



app.get(`${BASE_PATH}/api/inspection/defects`, inspectionController.getPendingDefects);
app.post(`${BASE_PATH}/api/inspection/autosave`, verifyToken, inspectionController.autosave);
app.post(`${BASE_PATH}/api/inspection/save-checkpoint`, verifyToken, inspectionController.saveCheckpoint);

// ─── Catch-all Fallback (React Router) ────────────────────────────────────────
// This MUST be the last route. It serves index.html for any request that 
// isn't a file or an API route, which fixes the 404 on refresh.
app.get(/.*/, (req, res) => {
    // If it starts with /api/, it's a genuine missing endpoint
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: `API Route ${req.url} not found` });
    }

    // Otherwise, assume it's a React route (like /defects)
    const indexPath = path.join(__dirname, 'public', 'dashboard', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ error: 'Page not found' });
    }
});

// Global Error Handler to prevent crash
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.message);
    console.error('Stack:', err.stack);

    // Check if headers sent to avoid "Headers already sent" errors
    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        error: 'Something broke on the server',
        message: err.message,
        // Only show stack in non-production
        stack: process.env.NODE_ENV === 'production' ? 'Refer to server logs' : err.stack
    });
});

// Database connection and Server start
sequelize.authenticate()
    .then(() => {
        console.log('--- DATABASE CONNECTED ---');
        return Promise.resolve();
    })
    .then(() => {
        console.log('--- SCHEMA SYNC BYPASS ---');

        // Socket.IO Base Setup (Attached to Server)
        const http = require('http');
        const server = http.createServer(app);
        const io = require('socket.io')(server, {
            cors: { origin: "*", methods: ["GET", "POST"] }
        });

        io.on('connection', (socket) => {
            console.log(`[SOCKET] Monitoring client connected: ${socket.id}`);
            socket.on('disconnect', () => console.log(`[SOCKET] Client disconnected: ${socket.id}`));
        });

        server.listen(PORT, '0.0.0.0', () => {
            console.log(`--- BACKEND IS LIVE (Real-time Enabled) ---`);
            console.log(`Listening on http://localhost:${PORT}`);
            // console.log(`Or http://192.168.1.2:${PORT} (for mobile)`);
            console.log(`Or http://192.168.1.12:${PORT} (for mobile)`);
        });
    })
    .catch(err => {
        console.error('FATAL DB/SYNC ERROR:', err.message, err.stack);
        console.error('Server process will now exit.');
        process.exit(1);
    });

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('FATAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('FATAL: Uncaught Exception:', err);
    setTimeout(() => process.exit(1), 500);
});