const ReportQueryService = require('../services/ReportQueryService');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

/**
 * Report Controller
 * Handles Production-Grade Reporting requests with optimization and safety checks.
 */

// GET /api/reports/summary
exports.getSummary = async (req, res) => {
    try {
        const { fromDate, toDate, moduleType } = req.query;
        console.log(`[REPORT] Summary Request: FROM=${fromDate}, TO=${toDate}, MODULE=${moduleType}`);

        if (!fromDate || !toDate) {
            return res.status(400).json({ error: 'fromDate and toDate are required' });
        }

        const data = await ReportQueryService.getSummaryReport({ fromDate, toDate, moduleType });
        console.log(`[REPORT] Summary Result: ${data ? 'Data Found' : 'No Data'}`);
        res.json({ data });
    } catch (err) {
        console.error('Report Summary Error:', err);
        res.status(500).json({ error: 'Failed to generate summary report' });
    }
};

// GET /api/reports/strategic-dashboard
exports.getStrategicDashboard = async (req, res) => {
    try {
        console.log(`[REPORT] Strategic Dashboard Data Requested`);
        const data = await ReportQueryService.getStrategicDashboard();
        res.json(data);
    } catch (err) {
        console.error('Strategic Dashboard Error:', err);
        res.status(500).json({ error: 'Failed to generate strategic dashboard data' });
    }
};

// GET /api/reports/inspectors
exports.getInspectors = async (req, res) => {
    try {
        const { fromDate, toDate, page = 1, limit = 10 } = req.query;
        console.log(`[REPORT] Inspector Request: FROM=${fromDate}, TO=${toDate}, PAGE=${page}`);

        if (!fromDate || !toDate) {
            return res.status(400).json({ error: 'fromDate and toDate are required' });
        }

        const { data, total } = await ReportQueryService.getInspectorReport({
            fromDate, toDate,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        console.log(`[REPORT] Inspector Result: ${data?.length || 0} rows found`);

        res.json({
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Inspector Report Error:', err);
        res.status(500).json({ error: 'Failed to generate inspector report' });
    }
};

// GET /api/reports/assets
exports.getAssets = async (req, res) => {
    try {
        const { fromDate, toDate, page = 1, limit = 10 } = req.query;
        console.log(`[REPORT] Asset Request: FROM=${fromDate}, TO=${toDate}, PAGE=${page}`);

        if (!fromDate || !toDate) {
            return res.status(400).json({ error: 'fromDate and toDate are required' });
        }

        const { data, total } = await ReportQueryService.getAssetReport({
            fromDate, toDate,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        console.log(`[REPORT] Asset Result: ${data?.length || 0} rows found`);

        res.json({
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Asset Report Error:', err);
        res.status(500).json({ error: 'Failed to generate asset report' });
    }
};

// GET /api/reports/defect-aging
exports.getAging = async (req, res) => {
    try {
        const { fromDate, toDate, page = 1, limit = 10 } = req.query;
        if (!fromDate || !toDate) {
            return res.status(400).json({ error: 'fromDate and toDate are required' });
        }

        const { data, total } = await ReportQueryService.getAgingReport({
            fromDate, toDate,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json({
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Aging Report Error:', err);
        res.status(500).json({ error: 'Failed to generate aging report' });
    }
};

// GET /api/reports/repeated
exports.getRepeated = async (req, res) => {
    try {
        const { fromDate, toDate, page = 1, limit = 10 } = req.query;
        if (!fromDate || !toDate) {
            return res.status(400).json({ error: 'fromDate and toDate are required' });
        }

        const { data, total } = await ReportQueryService.getRepeatedReport({
            fromDate, toDate,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json({
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Repeated Report Error:', err);
        res.status(500).json({ error: 'Failed to generate repeated defects report' });
    }
};

// GET /api/reports/recent
exports.getRecent = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const { data, total } = await ReportQueryService.getRecentSessions({
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json({
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Recent Sessions Error:', err);
        res.status(500).json({ error: 'Failed to fetch recent sessions' });
    }
};

// GET /api/reports/export
exports.exportReport = async (req, res) => {
    try {
        const { fromDate, toDate, moduleType, inspectorId, type = 'HISTORY', format = 'csv' } = req.query;
        if (!fromDate || !toDate) {
            return res.status(400).json({ error: 'fromDate and toDate are required for export' });
        }

        const { EXPORT_LIMIT } = require('../services/ReportConstants');
        let reportData = [];
        let reportTitle = 'Audit_Report';
        const params = { fromDate, toDate, moduleType, inspectorId };

        // Dynamic data fetching based on report type
        switch (type) {
            case 'SUMMARY':
                const summary = await ReportQueryService.getSummaryReport(params);
                reportData = [summary];
                reportTitle = 'Summary_Metrics';
                break;
            case 'INSPECTORS':
                const { data: inspectors } = await ReportQueryService.getInspectorReport({ ...params, page: 1, limit: EXPORT_LIMIT });
                reportData = inspectors;
                reportTitle = 'Inspector_Performance';
                break;
            case 'AGING':
                const { data: aging } = await ReportQueryService.getAgingReport({ ...params, page: 1, limit: EXPORT_LIMIT });
                reportData = aging;
                reportTitle = 'Defect_Aging';
                break;
            case 'REPEATED':
                const { data: repeated } = await ReportQueryService.getRepeatedReport({ ...params, page: 1, limit: EXPORT_LIMIT });
                reportData = repeated;
                reportTitle = 'Repeated_Defects';
                break;
            case 'SESSION_DETAILS': // History tab
            case 'HISTORY':
            default:
                const { data: history } = await ReportQueryService.getRecentSessions({ ...params, page: 1, limit: EXPORT_LIMIT });
                reportData = history;
                reportTitle = 'Inspection_History';
                break;
        }

        if (!reportData || reportData.length === 0) {
            return res.status(404).json({ error: 'No audit data found for the selected filters. Please verify date range and module.' });
        }

        const filename = `${reportTitle}_${fromDate}_to_${toDate}`;

        if (format === 'csv') {
            const headers = Object.keys(reportData[0]);
            const csvRows = [
                headers.join(','),
                ...reportData.map(row => headers.map(header => {
                    const val = row[header] === null || row[header] === undefined ? '' : row[header];
                    const stringVal = String(val).replace(/"/g, '""');
                    return `"${stringVal}"`;
                }).join(','))
            ];
            const csv = csvRows.join('\n');
            res.header('Content-Type', 'text/csv');
            res.attachment(`${filename}.csv`);
            return res.send(csv);
        } else {
            const ws = XLSX.utils.json_to_sheet(reportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Report");
            const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.attachment(`${filename}.xlsx`);
            return res.send(buf);
        }
    } catch (err) {
        console.error('Export Error:', err);
        res.status(500).json({ error: 'Export failed' });
    }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/reports/export/csv  — Lightweight CSV export
// ─────────────────────────────────────────────────────────────────
exports.exportCSV = async (req, res) => {
    try {
        const { fromDate, toDate, moduleType, inspectorId, type = 'SESSION_DETAILS' } = req.query;
        if (!fromDate || !toDate) {
            return res.status(400).json({ error: 'fromDate and toDate are required' });
        }

        const { EXPORT_LIMIT } = require('../services/ReportConstants');
        const params = { fromDate, toDate, moduleType, inspectorId, page: 1, limit: EXPORT_LIMIT };

        // Fetch recent sessions as the primary export dataset
        const { data: sessions } = await ReportQueryService.getRecentSessions(params);

        if (!sessions || sessions.length === 0) {
            return res.status(404).json({ error: 'No data found for the selected filters.' });
        }

        const headers = ['Module', 'Session ID', 'Status', 'Date', 'Inspector', 'Asset / Coach'];
        const csvRows = [
            headers.join(','),
            ...sessions.map(row => [
                `"${row.module_type || ''}"`,
                `"${row.session_id || row.id || ''}"`,
                `"${row.status || ''}"`,
                `"${row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}"`,
                `"${row.inspector_name || ''}"`,
                `"${row.asset_id || ''}"`
            ].join(','))
        ];

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Inspection_Export_${fromDate}_to_${toDate}.csv"`);
        return res.send('\uFEFF' + csvRows.join('\n')); // BOM prefix for Excel UTF-8 compatibility
    } catch (err) {
        console.error('CSV Export Error:', err);
        res.status(500).json({ error: 'CSV export failed' });
    }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/reports/export/excel  — Structured Excel workbook export
// ─────────────────────────────────────────────────────────────────
exports.exportExcel = async (req, res) => {
    try {
        const { fromDate, toDate, moduleType, inspectorId, type = 'SESSION_DETAILS' } = req.query;
        if (!fromDate || !toDate) {
            return res.status(400).json({ error: 'fromDate and toDate are required' });
        }

        const { EXPORT_LIMIT } = require('../services/ReportConstants');
        const params = { fromDate, toDate, moduleType, inspectorId, page: 1, limit: EXPORT_LIMIT };
        const { data: sessions } = await ReportQueryService.getRecentSessions(params);

        if (!sessions || sessions.length === 0) {
            return res.status(404).json({ error: 'No data found for the selected filters.' });
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'DARPAN Inspection System';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Inspection Reports', {
            pageSetup: { paperSize: 9, orientation: 'landscape' }
        });

        // Column definitions
        worksheet.columns = [
            { header: 'Module',       key: 'module',    width: 18 },
            { header: 'Session ID',   key: 'session',   width: 14 },
            { header: 'Status',       key: 'status',    width: 16 },
            { header: 'Date',         key: 'date',      width: 22 },
            { header: 'Inspector',    key: 'inspector', width: 22 },
            { header: 'Asset/Coach',  key: 'asset',     width: 16 },
        ];

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: '1F3864' }, size: 11 };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCE6F1' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
        headerRow.height = 24;

        // Add data rows
        sessions.forEach((row, idx) => {
            const dataRow = worksheet.addRow({
                module:    row.module_type || '',
                session:   row.session_id || row.id || '',
                status:    row.status || '',
                date:      row.createdAt ? new Date(row.createdAt).toLocaleString() : '',
                inspector: row.inspector_name || '',
                asset:     row.asset_id || ''
            });

            // Zebra row styling (even rows)
            if ((idx + 1) % 2 === 0) {
                dataRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F7FD' } };
            }

            dataRow.alignment = { vertical: 'middle', horizontal: 'center' };
            dataRow.height = 20;
        });

        // Add borders to all cells
        const lastRow = worksheet.rowCount;
        const lastCol = worksheet.columnCount;
        for (let r = 1; r <= lastRow; r++) {
            for (let c = 1; c <= lastCol; c++) {
                const cell = worksheet.getCell(r, c);
                cell.border = {
                    top:    { style: 'thin', color: { argb: 'D0D9E8' } },
                    left:   { style: 'thin', color: { argb: 'D0D9E8' } },
                    bottom: { style: 'thin', color: { argb: 'D0D9E8' } },
                    right:  { style: 'thin', color: { argb: 'D0D9E8' } },
                };
            }
        }

        // Freeze header row & enable auto-filter
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];
        worksheet.autoFilter = `A1:F1`;

        // Stream workbook to response
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Inspection_Report_${fromDate}_to_${toDate}.xlsx"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Excel Export Error:', err);
        res.status(500).json({ error: 'Excel export failed' });
    }
};
const { sequelize } = require('../models');

// Extract unique filter options for Mobile App drop-downs
exports.getMobileReportFilters = async (req, res) => {
    try {
        const sql = `
            SELECT DISTINCT 
                train_id as train_no, 
                coach_id as coach_no, 
                module_type as inspection_type,
                status as activity_type
            FROM reporting_sessions
            WHERE UPPER(status) IN ('FINALIZED', 'COMPLETED', 'SUBMITTED')
        `;
        
        const results = await sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });

        const trains = [...new Set(results.map(r => r.train_no).filter(Boolean))];
        const coaches = [...new Set(results.map(r => r.coach_no).filter(Boolean))];
        const types = [...new Set(results.map(r => r.inspection_type).filter(Boolean))];
        
        // Use standard Major/Minor for Activity Type instead of session status to match mobile expectations
        const activityTypes = ['Major', 'Minor'];

        res.json({
            trains,
            coaches,
            types,
            statuses: ['Completed'],
            activityTypes
        });
    } catch (err) {
        console.error('Mobile Report Filters Error:', err);
        res.status(500).json({ error: 'Failed to fetch filter options' });
    }
};

// Recreated legacy report endpoint for Mobile App
exports.getMobileReports = async (req, res) => {
    try {
        const { train_no, coach_no, inspection_type, activity_type, start_date, end_date, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        // Combine both finished and in-progress for mobile history log
        let whereClause = "UPPER(rs.status) NOT IN ('DELETED', 'ARCHIVED')";
        let replacements = { limit: parseInt(limit), offset: parseInt(offset) };

        if (train_no) { whereClause += " AND rs.train_id = :train_no"; replacements.train_no = train_no; }
        if (coach_no) { whereClause += " AND rs.coach_id = :coach_no"; replacements.coach_no = coach_no; }
        if (inspection_type) { whereClause += " AND rs.module_type = :inspection_type"; replacements.inspection_type = inspection_type; }
        if (start_date && end_date) { 
            whereClause += " AND rs.inspection_datetime BETWEEN :start_date AND :end_date"; 
            replacements.start_date = `${start_date} 00:00:00`;
            replacements.end_date = `${end_date} 23:59:59`;
        }

        const sql = `
            SELECT 
                rs.id,
                COALESCE(CONCAT(CAST(rs.source_session_id AS CHAR), '-', rs.id), CONCAT('LEGACY-', rs.id)) as submission_id,
                COALESCE(pt.train_number, CAST(rs.train_id AS CHAR), 'N/A') as train_number,
                rs.asset_id as coach_number,
                rs.module_type as category_name,
                rs.inspection_datetime as createdAt,
                COALESCE(u.name, 'Unknown') as user_name,
                rs.user_id,
                CASE WHEN rs.total_deficiencies > 0 THEN 'Major' ELSE 'Minor' END as severity
            FROM reporting_sessions rs
            LEFT JOIN users u ON rs.user_id = u.id
            LEFT JOIN pitline_trains pt ON rs.train_id = pt.id AND rs.module_type = 'PITLINE'
            WHERE ${whereClause}
            ORDER BY rs.inspection_datetime DESC
            LIMIT :limit OFFSET :offset
        `;

        const countSql = `SELECT COUNT(*) as total FROM reporting_sessions rs WHERE ${whereClause}`;

        const [data, countResult] = await Promise.all([
            sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT }),
            sequelize.query(countSql, { replacements, type: sequelize.QueryTypes.SELECT })
        ]);

        res.json({
            success: true,
            data,
            pages: Math.ceil((countResult[0]?.total || 0) / limit),
            total: countResult[0]?.total || 0
        });
    } catch (err) {
        console.error('Mobile Reports Error:', err);
        res.status(500).json({ error: 'Failed to fetch mobile reports' });
    }
};

// GET /api/report-details
exports.getReportDetails = async (req, res) => {
    try {
        let { submission_id, coach_number, date, user_id } = req.query;
        
        console.log(`[REPORT DETAILS] Request for ID: ${submission_id}, Coach: ${coach_number}`);

        // Handle the new unique format: SOURCE_ID-ROW_ID
        let rowId = null;
        if (submission_id && submission_id.includes('-')) {
            const parts = submission_id.split('-');
            submission_id = parts[0];
            rowId = parts[1];
        }

        // 1. Find the reporting session
        let session;
        if (rowId && !isNaN(parseInt(rowId))) {
            // Direct hit by internal ID
            session = await sequelize.query(
                `SELECT * FROM reporting_sessions WHERE id = :rowId LIMIT 1`,
                { replacements: { rowId }, type: sequelize.QueryTypes.SELECT }
            );
        } else if (submission_id && submission_id !== 'LEGACY' && submission_id !== 'undefined') {
            session = await sequelize.query(
                `SELECT * FROM reporting_sessions WHERE source_session_id = :submission_id LIMIT 1`,
                { replacements: { submission_id }, type: sequelize.QueryTypes.SELECT }
            );
        } else {
            // Fallback for legacy items using other metadata
            session = await sequelize.query(
                `SELECT * FROM reporting_sessions 
                 WHERE asset_id = :coach_number 
                 AND user_id = :user_id 
                 AND DATE(inspection_datetime) = DATE(:date) 
                 LIMIT 1`,
                { replacements: { coach_number, user_id, date }, type: sequelize.QueryTypes.SELECT }
            );
        }

        if (!session || session.length === 0) {
            return res.status(404).json({ error: 'Report session not found' });
        }

        const reportSession = session[0];

        // 2. Fetch all answers for this session with Activity context
        const answers = await sequelize.query(
            `SELECT
                ra.id,
                ra.question_text,
                ra.question_text as question_text_snapshot,
                ra.section_title,
                ra.section_title as item_name,
                ra.section_title as subcategory_name,
                ra.answer_status as status,
                ra.reasons_json as reasons,
                ra.remark as remarks,
                ra.before_photo_url as photo_url,
                ra.resolved,
                ra.after_photo_url,
                ra.source_question_id as question_id,
                COALESCE(act.type, 'General') as activity_type
             FROM reporting_answers ra
             LEFT JOIN questions q ON ra.source_question_id = q.id
             LEFT JOIN activities act ON q.activity_id = act.id
             WHERE ra.reporting_session_id = :id
             ORDER BY ra.id ASC`,
            { replacements: { id: reportSession.id }, type: sequelize.QueryTypes.SELECT }
        );

        // 3. Deduplication (source_question_id + reporting_session_id)
        const uniqueAnswersMap = new Map();
        answers.forEach(ans => {
            const key = `${ans.question_id}-${reportSession.id}`;
            if (!uniqueAnswersMap.has(key)) {
                uniqueAnswersMap.set(key, ans);
            }
        });

        const uniqueAnswers = Array.from(uniqueAnswersMap.values());

        // 4. Parse JSON reasons and calculate counts
        let yesCount = 0;
        let noCount = 0;
        let naCount = 0;

        const normalizedAnswers = uniqueAnswers.map(ans => {
            const status = (ans.status || '').toUpperCase();
            if (status === 'OK' || status === 'YES') yesCount++;
            else if (status === 'DEFICIENCY' || status === 'NO') noCount++;
            else naCount++;

            return {
                ...ans,
                question_text_snapshot: ans.question_text,
                item_name: ans.section_title,
                subcategory_name: ans.section_title,
                reasons: typeof ans.reasons === 'string' ? JSON.parse(ans.reasons) : (ans.reasons || []),
                activity: ans.activity_type || 'General'
            };
        });

        // 5. Build Hierarchical Structure (Area -> Activity -> Questions)
        const hierarchyMap = {};
        normalizedAnswers.forEach(ans => {
            const area = ans.section_title || 'General';
            const activity = ans.activity;

            if (!hierarchyMap[area]) {
                hierarchyMap[area] = { title: area, activities: {} };
            }
            if (!hierarchyMap[area].activities[activity]) {
                hierarchyMap[area].activities[activity] = { title: activity, questions: [] };
            }
            hierarchyMap[area].activities[activity].questions.push(ans);
        });

        const hierarchicalDetails = Object.values(hierarchyMap).map(area => ({
            title: area.title,
            activities: Object.values(area.activities)
        }));

        res.json({
            success: true,
            metadata: {
                train_number: reportSession.train_id || 'N/A',
                coach_number: reportSession.asset_id,
                date: reportSession.inspection_datetime,
                inspector_name: reportSession.user_id,
                status: reportSession.status,
                item_name: reportSession.module_type,
                subcategory_name: reportSession.module_type
            },
            details: hierarchicalDetails, // Mobile app will receive hierarchical data
            stats: {
                total: reportSession.total_master_questions || uniqueAnswers.length,
                defects: reportSession.total_deficiencies,
                resolved: reportSession.total_resolved,
                compliance: reportSession.compliance_score,
                yes_count: yesCount,
                no_count: noCount,
                na_count: naCount
            }
        });
    } catch (err) {
        console.error('Mobile Report Details Error:', err);
        res.status(500).json({ error: 'Failed to fetch report details' });
    }
};
