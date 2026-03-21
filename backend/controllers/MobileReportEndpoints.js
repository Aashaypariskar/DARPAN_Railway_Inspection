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

        let whereClause = "UPPER(rs.status) IN ('FINALIZED', 'COMPLETED', 'SUBMITTED')";
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
                rs.source_session_id as submission_id,
                rs.train_id as train_number,
                rs.coach_id as coach_number,
                rs.module_type as category_name,
                rs.inspection_datetime as createdAt,
                COALESCE(u.name, 'Unknown') as user_name,
                rs.user_id,
                CASE WHEN rs.total_deficiencies > 0 THEN 'Major' ELSE 'Minor' END as severity
            FROM reporting_sessions rs
            LEFT JOIN users u ON rs.user_id = u.id
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
