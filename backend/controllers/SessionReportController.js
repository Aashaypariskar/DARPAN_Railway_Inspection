const SessionReportService = require('../services/SessionReportService');
const { sequelize } = require('../models');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const puppeteer = require('puppeteer-core');
const handlebars = require('handlebars');

const service = new SessionReportService();

const BASE_URL = process.env.BASE_URL || 'http://192.168.1.4:8080';

const toAbsoluteUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}/${path.replace(/^\/+/, '')}`;
};

// Helper to find Chrome/Edge on Windows
const getExecutablePath = () => {
    // 1. Check for explicit environment variable first
    if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

    // 2. Fallback to standard locations
    const paths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Users\\' + (process.env.USERNAME || 'Admin') + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    return paths.find(p => fs.existsSync(p));
};

// Handlebars Helpers
if (!handlebars.helpers.eq) {
    handlebars.registerHelper('eq', (a, b) => a === b);
}
if (!handlebars.helpers.or) {
    handlebars.registerHelper('or', (a, b) => a || b);
}
if (!handlebars.helpers.join) {
    handlebars.registerHelper('join', (arr, sep) => arr ? arr.join(sep) : '');
}
if (!handlebars.helpers.add) {
    handlebars.registerHelper('add', (a, b) => a + b);
}

/**
 * Session Report Controller
 */

// GET /api/reports/session/:sessionId
exports.getSessionJSON = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { moduleType } = req.query;
        let finalSessionId = sessionId;
        let finalModuleType = moduleType || null;

        // 1. Check if this is a direct Reporting Session ID (Performance & Isolation path)
        const reportingRecord = await sequelize.query(
            'SELECT id, module_type, source_session_id, user_id FROM reporting_sessions WHERE id = :sessionId LIMIT 1',
            { replacements: { sessionId }, type: sequelize.QueryTypes.SELECT }
        );

        if (reportingRecord.length > 0) {
            // --- DATA ISOLATION ---
            if (req.user && req.user.role !== 'SUPER_ADMIN' && reportingRecord[0].user_id !== req.user.id) {
                return res.status(403).json({ error: 'Unauthorized: You do not have access to this report session' });
            }
            // It's a reporting ID!
            finalSessionId = reportingRecord[0].id;
            finalModuleType = reportingRecord[0].module_type;
        } else {
            // 2. Legacy Fallback: Try detection via source_session_id
            if (!finalModuleType) {
                finalModuleType = await service.detectSessionModule(sessionId);
            }
            
            if (!finalModuleType) {
                return res.status(404).json({ error: 'Session record not found in reporting database' });
            }
            
            // Re-fetch the actual reporting ID for the service to use
            const sourceRecord = await sequelize.query(
                'SELECT id, user_id FROM reporting_sessions WHERE source_session_id = :sessionId AND module_type = :moduleType LIMIT 1',
                { replacements: { sessionId, moduleType: finalModuleType }, type: sequelize.QueryTypes.SELECT }
            );
            if (sourceRecord.length > 0) {
                // --- DATA ISOLATION ---
                if (req.user && req.user.role !== 'SUPER_ADMIN' && sourceRecord[0].user_id !== req.user.id) {
                    return res.status(403).json({ error: 'Unauthorized: Access denied' });
                }
                finalSessionId = sourceRecord[0].id;
            }
        }

        const report = await service.getSessionDetail(finalSessionId, finalModuleType);
        res.json(report);
    } catch (err) {
        console.error('Session Report Error:', err);
        res.status(500).json({ error: 'Failed to retrieve session report metadata' });
    }
};

// GET /api/reports/session/:sessionId/export
exports.exportSessionPDF = async (req, res) => {
    let browser;
    try {
        const { sessionId } = req.params;
        let finalSessionId = sessionId;
        let finalModuleType = null;

        console.log(`[PDF] Export Request: ID=${sessionId}`);

        // 1. Check if this is a direct Reporting Session ID
        const reportingRecord = await sequelize.query(
            'SELECT id, module_type, user_id FROM reporting_sessions WHERE id = :sessionId LIMIT 1',
            { replacements: { sessionId }, type: sequelize.QueryTypes.SELECT }
        );

        if (reportingRecord.length > 0) {
            // --- DATA ISOLATION ---
            if (req.user && req.user.role !== 'SUPER_ADMIN' && reportingRecord[0].user_id !== req.user.id) {
                return res.status(403).json({ error: 'Unauthorized: Access denied' });
            }
            finalSessionId = reportingRecord[0].id;
            finalModuleType = reportingRecord[0].module_type;
        } else {
            // 2. Legacy Fallback
            finalModuleType = await service.detectSessionModule(sessionId);
            if (!finalModuleType) {
                return res.status(404).json({
                    error: 'Cannot detect module for this session. Ensure it is indexed in the reporting layer.'
                });
            }

            const sourceRecord = await sequelize.query(
                'SELECT id, user_id FROM reporting_sessions WHERE source_session_id = :sessionId AND module_type = :finalModuleType LIMIT 1',
                { replacements: { sessionId, finalModuleType }, type: sequelize.QueryTypes.SELECT }
            );
            if (sourceRecord.length > 0) {
                // --- DATA ISOLATION ---
                if (req.user && req.user.role !== 'SUPER_ADMIN' && sourceRecord[0].user_id !== req.user.id) {
                    return res.status(403).json({ error: 'Unauthorized: Access denied' });
                }
                finalSessionId = sourceRecord[0].id;
            }
        }

        // 3. Fetch normalized data using the reporting ID
        const data = await service.getSessionDetail(finalSessionId, finalModuleType);

        if (!data) {
            return res.status(404).json({ error: 'Session report data structure missing' });
        }

        // 3. Export Eligibility (Now handles Drafts via template Watermarks)

        // 4. Image Resolution — embed as base64 data URIs for Puppeteer setContent() compatibility
        // (file:// URLs are blocked by same-origin policy when using setContent; base64 is always safe)
        const resolveImageToBase64 = async (relPath) => {
            if (!relPath) return null;
            try {
                // --- Already an HTTP/HTTPS URL ---
                if (relPath.startsWith('http')) {
                    // If it's our own BASE_URL, extract relative path to read from disk
                    if (relPath.startsWith(BASE_URL)) {
                        const relativePath = relPath.replace(BASE_URL, '').replace(/^\//, '');
                        // Now treat as relative
                        let cleanPath = relativePath.replace(/^\//, '').replace(/\//g, path.sep);
                        const searchPaths = [
                            path.resolve(__dirname, '..', cleanPath),
                            path.resolve(__dirname, '..', 'public', cleanPath),
                            path.resolve(__dirname, '..', cleanPath.replace(/^public[\\/\\]/, ''))
                        ];
                        for (const absolutePath of searchPaths) {
                            if (fs.existsSync(absolutePath)) {
                                const buffer = fs.readFileSync(absolutePath);
                                const ext = path.extname(absolutePath).slice(1).toLowerCase();
                                const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }[ext] || 'image/jpeg';
                                return `data:${mime};base64,${buffer.toString('base64')}`;
                            }
                        }
                        console.warn(`[PDF] Image not found on disk: ${relPath}`);
                        return null;
                    } else {
                        // External URL, fetch it
                        const httpModule = relPath.startsWith('https') ? https : http;
                        const buffer = await new Promise((resolve, reject) => {
                            httpModule.get(relPath, (res) => {
                                const chunks = [];
                                res.on('data', chunk => chunks.push(chunk));
                                res.on('end', () => resolve(Buffer.concat(chunks)));
                                res.on('error', reject);
                            }).on('error', reject);
                        });
                        const ext = relPath.split('.').pop().split('?')[0].toLowerCase();
                        const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }[ext] || 'image/jpeg';
                        return `data:${mime};base64,${buffer.toString('base64')}`;
                    }
                }

                // --- Relative or absolute file path ---
                let cleanPath = relPath.replace(/^\//, '').replace(/\//g, path.sep);
                const searchPaths = [
                    path.resolve(__dirname, '..', cleanPath),
                    path.resolve(__dirname, '..', 'public', cleanPath),
                    path.resolve(__dirname, '..', cleanPath.replace(/^public[\\/\\]/, ''))
                ];
                for (const absolutePath of searchPaths) {
                    if (fs.existsSync(absolutePath)) {
                        const buffer = fs.readFileSync(absolutePath);
                        const ext = path.extname(absolutePath).slice(1).toLowerCase();
                        const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }[ext] || 'image/jpeg';
                        return `data:${mime};base64,${buffer.toString('base64')}`;
                    }
                }
                console.warn(`[PDF] Image not found on disk: ${relPath}`);
                return null;
            } catch (err) {
                console.warn(`[PDF] Image resolution failed for ${relPath}:`, err.message);
                return null;
            }
        };

        // Resolve all images in parallel
        await Promise.all(
            data.sections.flatMap(section =>
                section.activities.flatMap(activity =>
                    activity.questions.map(async (q) => {
                        q.beforeImage = await resolveImageToBase64(q.beforeImage);
                        q.afterImage = await resolveImageToBase64(q.afterImage);
                    })
                )
            )
        );

        // 4. Strict Validation
        if (typeof data.summary.deficiencyCount !== 'number') {
            throw new Error('Data Integrity Violation: Summary metrics must be numeric');
        }

        // 5. Load and Compile Template
        const templatePath = path.join(__dirname, '../templates/session-report.html');
        if (!fs.existsSync(templatePath)) throw new Error('Report template missing');

        const templateHtml = fs.readFileSync(templatePath, 'utf8');
        const template = handlebars.compile(templateHtml);
        const compiledHtml = template({ ...data, generatedAt: new Date().toLocaleString() });

        // 6. Render PDF using Puppeteer
        const executablePath = getExecutablePath();

        browser = await puppeteer.launch({
            executablePath, // Will be undefined if not found, letting puppeteer choose default if available
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files']
        });

        const page = await browser.newPage();
        await page.setContent(compiledHtml, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
        });

        res.setHeader('Content-Type', 'application/pdf');
        const inline = req.query.inline === 'true';
        res.setHeader(
            'Content-Disposition',
            inline
                ? `inline; filename="Inspection_${sessionId}.pdf"`
                : `attachment; filename="AuditReport_${sessionId}.pdf"`
        );
        res.send(pdfBuffer);

        console.log(`[PDF] Successfully generated report for ${sessionId} [${moduleType}]`);
    } catch (err) {
        console.error('PDF Export Error:', err);
        res.status(500).json({ message: 'STABILIZATION_FAILURE', error: err.message });
    } finally {
        if (browser) await browser.close();
    }
};

exports.getSessionDefects = async (req, res) => {
    try {
        const { reportingId } = req.params;
        
        // --- DATA ISOLATION ---
        const sessionCheck = await sequelize.query(
            'SELECT user_id FROM reporting_sessions WHERE id = :reportingId LIMIT 1',
            { replacements: { reportingId }, type: sequelize.QueryTypes.SELECT }
        );
        if (sessionCheck.length > 0 && req.user && req.user.role !== 'SUPER_ADMIN' && sessionCheck[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const defects = await service.getSessionDefects(reportingId);
        res.json(defects);
    } catch (err) {
        console.error('Fetch Defects Error:', err);
        res.status(500).json({ error: 'Failed to retrieve defects for this session' });
    }
};
