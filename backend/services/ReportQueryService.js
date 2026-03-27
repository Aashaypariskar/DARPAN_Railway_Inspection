const sequelize = require('../config/db');
const { QueryTypes } = require('sequelize');
const { FINALIZED_STATUSES } = require('./ReportConstants');

/**
 * ReportQueryService - PROJECTION LAYER EDITION
 * High-performance reporting queries reading from normalized projection tables.
 */
class ReportQueryService {

    static getStatusFilter() {
        return FINALIZED_STATUSES.map(s => `'${s}'`).join(',');
    }

    static _buildWhere(filters, currentUser = null) {
        const { fromDate, toDate, moduleType, inspectorId } = filters;
        let where = 'rs.inspection_datetime BETWEEN :fromDate AND :toDate';
        let replacements = { fromDate, toDate };

        if (moduleType && moduleType !== 'ALL') {
            where += ' AND rs.module_type = :moduleType';
            replacements.moduleType = moduleType;
        }

        // --- DATA ISOLATION ---
        if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
            where += ' AND rs.user_id = :currentUserId';
            replacements.currentUserId = currentUser.id;
        } else if (inspectorId) {
            where += ' AND rs.user_id = :inspectorId';
            replacements.inspectorId = inspectorId;
        }

        return { where, replacements };
    }

    /**
     * Get Report Summary
     */
    static async getSummaryReport(filters, currentUser) {
        const { where, replacements } = this._buildWhere(filters, currentUser);
        const statusList = this.getStatusFilter();

        const sql = `
            SELECT 
                COUNT(*) as total_inspections,
                SUM(CASE WHEN UPPER(rs.status) NOT IN (${statusList}) THEN 1 ELSE 0 END) as in_progress_count,
                SUM(CASE WHEN UPPER(rs.status) IN (${statusList}) THEN 1 ELSE 0 END) as completed_inspections,
                SUM(CASE WHEN UPPER(rs.status) IN (${statusList}) THEN rs.total_deficiencies ELSE 0 END) as total_defects,
                SUM(CASE WHEN UPPER(rs.status) IN (${statusList}) THEN rs.total_deficiencies - rs.total_resolved ELSE 0 END) as active_defects
            FROM reporting_sessions rs
            WHERE ${where}
        `;

        const results = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
        return results[0] || { total_inspections: 0, in_progress_count: 0, completed_inspections: 0, total_defects: 0, active_defects: 0 };
    }

    /**
     * Get Inspector Performance Report
     */
    static async getInspectorReport(filters, currentUser) {
        const { fromDate, toDate, page = 1, limit = 10 } = filters;
        const offset = (page - 1) * limit;
        const { where, replacements } = this._buildWhere(filters, currentUser);
        const statusList = this.getStatusFilter();

        const sql = `
            SELECT 
                COALESCE(u.name, 'Unknown Inspector') as inspector_name,
                rs.user_id as inspector_id,
                COUNT(rs.id) as sessions_count,
                SUM(CASE WHEN UPPER(rs.status) IN (${statusList}) THEN 1 ELSE 0 END) as completed_count,
                AVG(CASE WHEN UPPER(rs.status) IN (${statusList}) THEN rs.compliance_score END) as avg_compliance
            FROM reporting_sessions rs
            LEFT JOIN users u ON rs.user_id = u.id
            WHERE ${where}
            GROUP BY rs.user_id
            ORDER BY sessions_count DESC
            LIMIT :limit OFFSET :offset
        `;

        const countSql = `
            SELECT COUNT(DISTINCT user_id) as total FROM reporting_sessions rs
            WHERE ${where}
        `;

        const [data, countResult] = await Promise.all([
            sequelize.query(sql, { replacements: { ...replacements, limit, offset }, type: QueryTypes.SELECT }),
            sequelize.query(countSql, { replacements, type: QueryTypes.SELECT })
        ]);

        return { data, total: countResult[0]?.total || 0 };
    }

    /**
     * Get Asset Performance (Train/Coach)
     */
    static async getAssetReport(filters, currentUser) {
        const { page = 1, limit = 10 } = filters;
        const offset = (page - 1) * limit;
        const { where, replacements } = this._buildWhere(filters, currentUser);

        const statusList = this.getStatusFilter();

        const sql = `
            SELECT 
                rs.asset_id,
                COUNT(DISTINCT CASE WHEN UPPER(rs.status) IN (${statusList}) THEN rs.id END) as inspection_count,
                SUM(CASE WHEN UPPER(rs.status) IN (${statusList}) THEN rs.total_deficiencies ELSE 0 END) as defect_count,
                SUM(CASE WHEN UPPER(rs.status) IN (${statusList}) THEN rs.total_master_questions - rs.total_deficiencies ELSE 0 END) as ok_count
            FROM reporting_sessions rs
            WHERE ${where}
            GROUP BY rs.asset_id
            ORDER BY inspection_count DESC
            LIMIT :limit OFFSET :offset
        `;

        const countSql = `
            SELECT COUNT(DISTINCT asset_id) as total FROM reporting_sessions rs
            WHERE ${where}
        `;

        const [data, countResult] = await Promise.all([
            sequelize.query(sql, { replacements: { ...replacements, limit, offset }, type: QueryTypes.SELECT }),
            sequelize.query(countSql, { replacements, type: QueryTypes.SELECT })
        ]);

        return { data, total: countResult[0]?.total || 0 };
    }

    /**
     * Get Defect Aging Analysis
     */
    static async getAgingReport(filters, currentUser) {
        const { page = 1, limit = 10 } = filters;
        const offset = (page - 1) * limit;
        const { where, replacements } = this._buildWhere(filters, currentUser);

        const sql = `
            SELECT 
                rs.module_type,
                ra.id as defect_id,
                rs.inspection_datetime as createdAt,
                ra.answer_status, 
                CASE 
                    WHEN ra.resolved = 0 THEN TIMESTAMPDIFF(DAY, rs.inspection_datetime, NOW())
                    ELSE 0 
                END as age_days,
                ra.resolved
            FROM reporting_answers ra
            JOIN reporting_sessions rs ON ra.reporting_session_id = rs.id
            WHERE ra.answer_status = 'DEFICIENCY'
              AND UPPER(rs.status) IN (${this.getStatusFilter()})
              AND ${where}
            ORDER BY age_days DESC
            LIMIT :limit OFFSET :offset
        `;

        const countSql = `
            SELECT COUNT(*) as total 
            FROM reporting_answers ra
            JOIN reporting_sessions rs ON ra.reporting_session_id = rs.id
            WHERE ra.answer_status = 'DEFICIENCY'
              AND UPPER(rs.status) IN (${this.getStatusFilter()})
              AND ${where}
        `;

        const [data, countResult] = await Promise.all([
            sequelize.query(sql, { replacements: { ...replacements, limit, offset }, type: QueryTypes.SELECT }),
            sequelize.query(countSql, { replacements, type: QueryTypes.SELECT })
        ]);

        return { data, total: countResult[0]?.total || 0 };
    }

    /**
     * Get Repeated Defects
     */
    static async getRepeatedReport(filters, currentUser) {
        const { page = 1, limit = 10 } = filters;
        const offset = (page - 1) * limit;
        const { where, replacements } = this._buildWhere(filters, currentUser);

        const sql = `
            SELECT 
                rs.asset_id as coach_number,
                ra.question_text as question_text_snapshot,
                COUNT(*) as occurrence_count,
                MAX(rs.inspection_datetime) as last_seen
            FROM reporting_answers ra
            JOIN reporting_sessions rs ON ra.reporting_session_id = rs.id
            WHERE ra.answer_status = 'DEFICIENCY'
              AND UPPER(rs.status) IN (${this.getStatusFilter()})
              AND ${where}
            GROUP BY rs.asset_id, ra.question_text
            HAVING occurrence_count > 1
            ORDER BY occurrence_count DESC
            LIMIT :limit OFFSET :offset
        `;

        const countSql = `
            SELECT COUNT(*) as total FROM (
                SELECT rs.asset_id, ra.question_text
                FROM reporting_answers ra
                JOIN reporting_sessions rs ON ra.reporting_session_id = rs.id
                WHERE ra.answer_status = 'DEFICIENCY'
                  AND UPPER(rs.status) IN (${this.getStatusFilter()})
                  AND ${where}
                GROUP BY rs.asset_id, ra.question_text
                HAVING COUNT(*) > 1
            ) res
        `;

        const [data, countResult] = await Promise.all([
            sequelize.query(sql, { replacements: { ...replacements, limit, offset }, type: QueryTypes.SELECT }),
            sequelize.query(countSql, { replacements, type: QueryTypes.SELECT })
        ]);

        return { data, total: countResult[0]?.total || 0 };
    }

    /**
     * Get Recent Sessions (History)
     */
    static async getRecentSessions(filters, currentUser) {
        const { page = 1, limit = 10, fromDate, toDate } = filters;
        const offset = (page - 1) * limit;

        let whereClause = '1=1';
        let replacements = { limit, offset };

        if (fromDate && toDate) {
            const { where, replacements: r } = this._buildWhere(filters, currentUser);
            whereClause = where;
            replacements = { ...replacements, ...r };
        } else {
            // Minimal filters for "Recents" if no dates provided
            if (filters.moduleType && filters.moduleType !== 'ALL') {
                whereClause += ' AND rs.module_type = :moduleType';
                replacements.moduleType = filters.moduleType;
            }

            // --- DATA ISOLATION ---
            if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
                whereClause += ' AND rs.user_id = :currentUserId';
                replacements.currentUserId = currentUser.id;
            } else if (filters.inspectorId) {
                whereClause += ' AND rs.user_id = :inspectorId';
                replacements.inspectorId = filters.inspectorId;
            }
        }

        const sql = `
            SELECT 
                rs.module_type,
                rs.id AS reporting_id,
                rs.source_session_id as session_id,
                rs.status,
                rs.inspection_datetime as createdAt,
                COALESCE(u.name, 'Unknown Inspector') as inspector_name,
                rs.asset_id
            FROM reporting_sessions rs
            LEFT JOIN users u ON rs.user_id = u.id
            WHERE ${whereClause}
            ORDER BY rs.inspection_datetime DESC
            LIMIT :limit OFFSET :offset
        `;

        const countSql = `
            SELECT COUNT(*) as total 
            FROM reporting_sessions rs 
            WHERE ${whereClause}
        `;

        const [data, countResult] = await Promise.all([
            sequelize.query(sql, { replacements, type: QueryTypes.SELECT }),
            sequelize.query(countSql, { replacements, type: QueryTypes.SELECT })
        ]);

        return { data, total: countResult[0]?.total || 0 };
    }

    /**
     * Get Strategic Dashboard Aggregate Metrics
     * Focused strictly on Compliance Health, Risk visibility, and Trend awareness.
     */
    static async getStrategicDashboard(currentUser) {
        const statuses = this.getStatusFilter();

        // Isolation Logic: Non-admins only see their own records
        let userFilter = '';
        let replacements = {};
        if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
            userFilter = ' AND user_id = :userId';
            replacements.userId = currentUser.id;
        }

        // 1. Compliance Health (Overall KPI)
        const healthSql = `
            SELECT 
                COUNT(*) as total_finalized,
                AVG(compliance_score) as avg_compliance,
                SUM(total_deficiencies) as total_defects,
                SUM(total_master_questions) as total_questions,
                SUM(total_deficiencies - total_resolved) as open_defects
            FROM reporting_sessions
            WHERE UPPER(status) IN (${statuses}) ${userFilter}
        `;

        // 2. Risk Hotspots (Bar Chart: Defect Rate By Module)
        const riskSql = `
            SELECT 
                UPPER(module_type) as module_type,
                SUM(total_deficiencies) as total_defects,
                SUM(total_master_questions) as total_questions,
                (SUM(total_deficiencies) / NULLIF(SUM(total_master_questions), 0) * 100) as defect_rate
            FROM reporting_sessions
            WHERE 1=1 ${userFilter}
            GROUP BY UPPER(module_type)
        `;

        // 3. Compliance Trend (Line Chart: Daily Rolling 30 Days)
        const trendSql = `
            SELECT 
                DATE(inspection_datetime) as \`date\`,
                AVG(compliance_score) as daily_compliance,
                COUNT(*) as daily_inspections
            FROM reporting_sessions
            WHERE UPPER(status) IN (${statuses}) ${userFilter}
              AND inspection_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(inspection_datetime)
            HAVING daily_inspections >= 1
            ORDER BY \`date\` ASC
        `;

        // 4. Inspection Pipeline (Lifecycle Counts)
        const pipelineSql = `
            SELECT 
                UPPER(status) as status_group,
                COUNT(*) as session_count,
                SUM(CASE WHEN (UPPER(status) NOT IN (${statuses})) AND (inspection_datetime < DATE_SUB(NOW(), INTERVAL 24 HOUR)) THEN 1 ELSE 0 END) as overdue_count
            FROM reporting_sessions
            WHERE 1=1 ${userFilter}
            GROUP BY UPPER(status)
        `;

        // 4b. Module Distribution (Pie Chart: Volume By Module)
        const moduleDistSql = `
            SELECT 
                UPPER(module_type) as module_type,
                COUNT(*) as session_count
            FROM reporting_sessions
            WHERE 1=1 ${userFilter}
            GROUP BY UPPER(module_type)
        `;

        // 4c. Overall Overdue Metrics (Global context within user scope)
        const overdueSql = `
            SELECT COUNT(*) as global_overdue
            FROM reporting_sessions
            WHERE UPPER(status) NOT IN (${statuses}) ${userFilter}
              AND inspection_datetime < DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `;

        // 5. High Risk Assets (Table: Lowest Compliance Score)
        const highRiskAssetsSql = `
            SELECT 
                train_id as train_no,
                coach_id as coach_no,
                module_type,
                AVG(compliance_score) as avg_compliance_score,
                SUM(total_deficiencies) as total_deficiency_count,
                COUNT(*) as inspection_count
            FROM reporting_sessions
            WHERE UPPER(status) IN (${statuses}) ${userFilter}
              AND train_id IS NOT NULL 
              AND coach_id IS NOT NULL
            GROUP BY train_id, coach_id, module_type
            HAVING COUNT(*) >= 3
            ORDER BY avg_compliance_score ASC
            LIMIT 5
        `;

        // 6. Critical Alerts (Attention Required: Active Deficiencies)
        let alertFilter = '';
        let alertReplacements = {};
        if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
            alertFilter = ' AND rs.user_id = :userId';
            alertReplacements.userId = currentUser.id;
        }

        const criticalAlertsSql = `
            SELECT 
                rs.train_id as train_no,
                rs.coach_id as coach_no,
                rs.module_type,
                ra.question_text as defect_reason,
                rs.created_at as alert_date
            FROM reporting_answers ra
            JOIN reporting_sessions rs ON ra.reporting_session_id = rs.id
            WHERE UPPER(ra.answer_status) = 'DEFICIENCY'
              AND UPPER(rs.status) NOT IN ('FINALIZED', 'COMPLETED')
              AND (ra.resolved = 0 OR ra.resolved IS NULL) 
              ${alertFilter} 
            ORDER BY rs.created_at DESC
            LIMIT 5
        `;

        // alertsResult uses alertReplacements defined above

        const [healthResult, riskResult, trendResult, pipelineResult, assetsResult, alertsResult, moduleDistResult, overdueResult] = await Promise.all([
            sequelize.query(healthSql, { replacements, type: QueryTypes.SELECT }),
            sequelize.query(riskSql, { replacements, type: QueryTypes.SELECT }),
            sequelize.query(trendSql, { replacements, type: QueryTypes.SELECT }),
            sequelize.query(pipelineSql, { replacements, type: QueryTypes.SELECT }),
            sequelize.query(highRiskAssetsSql, { replacements, type: QueryTypes.SELECT }),
            sequelize.query(criticalAlertsSql, { replacements: alertReplacements, type: QueryTypes.SELECT }),
            sequelize.query(moduleDistSql, { replacements, type: QueryTypes.SELECT }),
            sequelize.query(overdueSql, { replacements, type: QueryTypes.SELECT })
        ]);

        const health = healthResult[0] || {};
        const defectRate = health.total_questions > 0 ? (health.total_defects / health.total_questions) * 100 : 0;

        let pipelineCounts = {
            draftCount: 0,
            inProgressCount: 0,
            finalizedCount: 0,
            totalSessions: 0
        };

        pipelineResult.forEach(row => {
            const status = row.status_group;
            if (status === 'DRAFT') {
                pipelineCounts.draftCount += row.session_count;
            } else if (status === 'IN_PROGRESS') {
                pipelineCounts.inProgressCount += row.session_count;
            } else if (['FINALIZED', 'COMPLETED', 'SUBMITTED'].includes(status)) {
                pipelineCounts.finalizedCount += row.session_count;
            }

            pipelineCounts.totalSessions += row.session_count;
        });

        const overdueCount = overdueResult[0]?.global_overdue || 0;

        const today = new Date();
        const last30Days = [];
        for (let i = 29; i >= 0; i--) {
            // Subtract i days (approximate 24h intervals)
            const d = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
            // Shift timezone safely so it matches dates
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            last30Days.push(d.toISOString().split('T')[0]);
        }

        let lastKnownCompliance = 100.0;
        if (trendResult.length > 0 && trendResult[0].daily_compliance) {
            lastKnownCompliance = parseFloat(trendResult[0].daily_compliance);
        }

        const continuousTrend = last30Days.map(dateStr => {
            const found = trendResult.find(r => r.date === dateStr);
            if (found && found.daily_compliance) {
                lastKnownCompliance = parseFloat(found.daily_compliance);
            }
            return {
                date: dateStr,
                compliance: lastKnownCompliance.toFixed(1)
            };
        });

        return {
            complianceHealth: {
                avgCompliance: health.avg_compliance ? parseFloat(health.avg_compliance).toFixed(1) : '100.0',
                totalFinalized: health.total_finalized || 0,
                defectRate: defectRate.toFixed(1),
                openDefects: health.open_defects || 0
            },
            moduleDistribution: ['PITLINE', 'SICKLINE', 'COMMISSIONARY', 'WSP', 'CAI'].map(mod => {
                const found = moduleDistResult.find(r => r.module_type === mod);
                return { module: mod, count: found ? found.session_count : 0 };
            }),
            riskByModule: ['PITLINE', 'SICKLINE', 'COMMISSIONARY', 'WSP', 'CAI'].map(mod => {
                const found = riskResult.find(r => r.module_type === mod);
                return {
                    module: mod,
                    defectRate: found && found.defect_rate ? parseFloat(found.defect_rate).toFixed(1) : '0.0'
                };
            }),
            complianceTrend: continuousTrend,
            inspectionPipeline: { ...pipelineCounts, overdueCount },
            highRiskAssets: assetsResult.map(r => ({
                trainNo: r.train_no || '--',
                coachNo: r.coach_no || '--',
                module: r.module_type,
                compliance: r.avg_compliance_score ? parseFloat(r.avg_compliance_score).toFixed(1) : '100.0',
                defects: r.total_deficiency_count || 0
            })),
            criticalAlerts: alertsResult.map(r => {
                let assetLabel = 'Unspecified Asset';
                if (r.train_no && r.coach_no) assetLabel = `Train ${r.train_no} | Coach C-${r.coach_no}`;
                else if (r.train_no) assetLabel = `Train ${r.train_no}`;
                else if (r.coach_no) assetLabel = `Coach C-${r.coach_no}`;

                return {
                    assetLabel,
                    module: r.module_type,
                    issue: r.defect_reason || 'Unknown defect',
                    created_at: r.alert_date
                };
            })
        };
    }
}

module.exports = ReportQueryService;
