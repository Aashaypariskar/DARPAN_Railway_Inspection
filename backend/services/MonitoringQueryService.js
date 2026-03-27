const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');

/**
 * MonitoringQueryService - Handles complex UNION queries for multi-module monitoring
 */

/**
 * getUnifiedSessions
 * Normalizes all session tables into a single stream with dynamic filtering
 */
exports.getUnifiedSessions = async (page, limit, filters = {}, currentUser = null) => {
    const offset = (page - 1) * limit;
    const subLimit = (page * limit) + 50;
    const replacements = { limit, offset, subLimit };

    const subQueries = [];
    const modules = [
        { name: 'WSP', table: 'wsp_sessions', inspectorCol: 'created_by' },
        { name: 'SICKLINE', table: 'sickline_sessions', inspectorCol: 'created_by' },
        { name: 'COMMISSIONARY', table: 'commissionary_sessions', inspectorCol: 'created_by' },
        { name: 'CAI', table: 'cai_sessions', inspectorCol: 'inspector_id' },
        { name: 'PITLINE', table: 'pitline_sessions', inspectorCol: 'inspector_id' }
    ];

    const isSQLite = sequelize.options.dialect === 'sqlite';

    for (const mod of modules) {
        if (filters.module && filters.module !== mod.name) continue;

        let whereArr = ["1=1"];
        if (filters.startDate && filters.endDate) {
            whereArr.push(`s.createdAt BETWEEN :startDate AND :endDate`);
            replacements.startDate = `${filters.startDate} 00:00:00`;
            replacements.endDate = `${filters.endDate} 23:59:59`;
        }
        if (filters.status) {
            whereArr.push(`s.status = :status`);
            replacements.status = filters.status;
        }

        // --- DATA ISOLATION ---
        if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
            whereArr.push(`s.${mod.inspectorCol} = :currentUserId`);
            replacements.currentUserId = currentUser.id;
        } else if (filters.inspector) {
            whereArr.push(`s.${mod.inspectorCol} = :inspector`);
            replacements.inspector = filters.inspector;
        }

        const dateExpr = isSQLite ? `datetime(s.createdAt)` : `s.createdAt`;
        const coachTable = mod.name === 'PITLINE' ? 'pitline_coaches' : 'coaches';
        
        const selectFields = `
            s.id AS session_id, 
            '${mod.name}' AS module_type, 
            c.coach_number, 
            s.coach_id,
            u.name AS inspector_name, 
            s.${mod.inspectorCol} AS inspector_id,
            ${dateExpr} AS created_at, 
            s.status,
            rs_proj.id AS reporting_id
        `;

        subQueries.push(`(
            SELECT ${selectFields} 
            FROM ${mod.table} s
            LEFT JOIN ${coachTable} c ON s.coach_id = c.id
            LEFT JOIN users u ON s.${mod.inspectorCol} = u.id
            LEFT JOIN reporting_sessions rs_proj ON rs_proj.source_session_id = s.id AND rs_proj.module_type = '${mod.name}'
            WHERE ${whereArr.join(' AND ')} 
            ORDER BY s.createdAt DESC 
            LIMIT :subLimit
        )`);
    }

    if (subQueries.length === 0) return [];

    const query = `
        SELECT * FROM (
            ${subQueries.join('\n            UNION ALL\n            ')}
        ) AS unified_sessions
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    `;

    return await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });
};

/**
 * getUnifiedDefects
 * Normalizes all answer tables into a single stream of deficiencies with dynamic filtering
 */
exports.getUnifiedDefects = async (page, limit, filters = {}, currentUser = null) => {
    const offset = (page - 1) * limit;
    const subLimit = (page * limit) + 50;
    const replacements = { limit, offset, subLimit };

    const subQueries = [];
    const answerModules = [
        { name: 'WSP', table: 'inspection_answers', sessionTable: 'wsp_sessions', inspectorCol: 'created_by' },
        { name: 'SICKLINE', table: 'sickline_answers', sessionTable: 'sickline_sessions', inspectorCol: 'created_by' },
        { name: 'COMMISSIONARY', table: 'commissionary_answers', sessionTable: 'commissionary_sessions', inspectorCol: 'created_by' },
        { name: 'CAI', table: 'cai_answers', sessionTable: 'cai_sessions', inspectorCol: 'inspector_id' }
    ];

    for (const mod of answerModules) {
        if (filters.module && filters.module !== mod.name) continue;

        let whereArr = ["status = 'DEFICIENCY'"];
        if (filters.startDate && filters.endDate) {
            whereArr.push(`createdAt BETWEEN :startDate AND :endDate`);
            replacements.startDate = `${filters.startDate} 00:00:00`;
            replacements.endDate = `${filters.endDate} 23:59:59`;
        }
        if (filters.status && (filters.status === '0' || filters.status === '1')) {
            whereArr.push(`resolved = :status`);
            replacements.status = filters.status;
        }
        // --- DATA ISOLATION ---
        if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
            whereArr.push(`session_id IN (SELECT id FROM ${mod.sessionTable} WHERE ${mod.inspectorCol} = :currentUserId)`);
            replacements.currentUserId = currentUser.id;
        } else if (filters.inspector) {
            whereArr.push(`session_id IN (SELECT id FROM ${mod.sessionTable} WHERE ${mod.inspectorCol} = :inspector)`);
            replacements.inspector = filters.inspector;
        }

        const where = `WHERE ${whereArr.join(' AND ')}`;

        // Dynamic column selection to handle cross-table differences
        const tableColumns = await sequelize.getQueryInterface().describeTable(mod.table);
        const hasPhotoUrl = Object.prototype.hasOwnProperty.call(tableColumns, "photo_url");
        const hasBeforePhotoUrl = Object.prototype.hasOwnProperty.call(tableColumns, "before_photo_url");
        const hasAfterPhotoUrl = Object.prototype.hasOwnProperty.call(tableColumns, "after_photo_url");
        const hasImagePath = Object.prototype.hasOwnProperty.call(tableColumns, "image_path");
        const hasResolvedImagePath = Object.prototype.hasOwnProperty.call(tableColumns, "resolved_image_path");
        const hasModuleType = Object.prototype.hasOwnProperty.call(tableColumns, "module_type");
        const hasRemarks = Object.prototype.hasOwnProperty.call(tableColumns, "remarks");
        const hasRemark = Object.prototype.hasOwnProperty.call(tableColumns, "remark");
        const hasReasons = Object.prototype.hasOwnProperty.call(tableColumns, "reasons");
        const hasReasonIds = Object.prototype.hasOwnProperty.call(tableColumns, "reason_ids");

        let photoUrlSel = 'NULL AS photo_url';
        if (hasPhotoUrl) photoUrlSel = 'photo_url';
        else if (hasBeforePhotoUrl) photoUrlSel = 'before_photo_url AS photo_url';

        let afterPhotoUrlSel = 'NULL AS after_photo_url';
        if (hasAfterPhotoUrl) afterPhotoUrlSel = 'after_photo_url';

        let imagePathSel = 'NULL AS image_path';
        if (hasImagePath) imagePathSel = 'image_path';

        let resolvedImagePathSel = 'NULL AS resolved_image_path';
        if (hasResolvedImagePath) resolvedImagePathSel = 'resolved_image_path';

        const hasBeforeBit = `(${hasPhotoUrl ? 'photo_url IS NOT NULL' : (hasBeforePhotoUrl ? 'before_photo_url IS NOT NULL' : '0')} OR ${hasImagePath ? 'image_path IS NOT NULL' : '0'}) AS has_before_photo`;
        const hasAfterBit = `(${hasAfterPhotoUrl ? 'after_photo_url IS NOT NULL' : '0'} OR ${hasResolvedImagePath ? 'resolved_image_path IS NOT NULL' : '0'}) AS has_after_photo`;

        const photoFields = `${photoUrlSel}, ${afterPhotoUrlSel}, ${hasBeforeBit}, ${hasAfterBit}, ${imagePathSel}, ${resolvedImagePathSel}`;

        // Polymorphic Module Type Handling
        const moduleTypeSel = hasModuleType ? 'module_type' : `'${mod.name}' AS module_type`;
        const remarksSel = hasRemarks ? 'remarks' : (hasRemark ? 'remark AS remarks' : "'' AS remarks");
        const reasonsSel = hasReasons ? 'reasons' : (hasReasonIds ? 'reason_ids AS reasons' : "NULL AS reasons");

        subQueries.push(`(SELECT id AS answer_id, session_id, ${moduleTypeSel}, question_text_snapshot AS question_text, ${remarksSel}, ${reasonsSel}, ${photoFields}, createdAt AS created_at, status, resolved FROM ${mod.table} ${where} ORDER BY createdAt DESC LIMIT :subLimit)`);
    }

    if (subQueries.length === 0) return [];

    const query = `
        SELECT * FROM (
            ${subQueries.join('\n            UNION ALL\n            ')}
        ) AS unified_defects
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    `;

    const results = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
    });

    const { normalizeImagePath, getBestImageUrl, findImageByTimestamp } = require('../utils/pathHelper');

    // Enhanced normalization to salvage partially broken paths and filenames
    return await Promise.all(results.map(async (row) => {
        let photoUrl = normalizeImagePath(row.photo_url) || normalizeImagePath(row.image_path) || normalizeImagePath(row.before_photo_url);

        const safeAfterPhotoUrl = normalizeImagePath(row.after_photo_url) || normalizeImagePath(row.resolved_image_path);

        // Deep Salvage: If primary record has no valid before photo, check for "sibling" records (duplicates/OKs)
        if (!photoUrl) {
            try {
                const tableMap = {
                    'WSP': 'inspection_answers',
                    'SICKLINE': 'sickline_answers',
                    'COMMISSIONARY': 'commissionary_answers',
                    'CAI': 'cai_answers',
                    'PITLINE': 'inspection_answers'
                };
                const tableName = tableMap[row.module_type];
                if (tableName) {
                    const tableColumns = await sequelize.getQueryInterface().describeTable(tableName);
                    const hasImagePath = Object.prototype.hasOwnProperty.call(tableColumns, "image_path");
                    const hasBeforePhoto = Object.prototype.hasOwnProperty.call(tableColumns, "before_photo_url");
                    const hasPhotoUrl = Object.prototype.hasOwnProperty.call(tableColumns, "photo_url");

                    let selectCols = [];
                    if (hasPhotoUrl) selectCols.push("photo_url");
                    if (hasImagePath) selectCols.push("image_path");
                    if (hasBeforePhoto) selectCols.push("before_photo_url");

                    if (selectCols.length > 0) {
                        const whereClause = selectCols.map(c => `${c} LIKE '%uploads/%'`).join(' OR ');

                        const [sibling] = await sequelize.query(
                            `SELECT ${selectCols.join(", ")} FROM ${tableName} 
                             WHERE session_id = :sid 
                             AND (question_text_snapshot = :qtext OR id = :aid) 
                             AND (${whereClause}) 
                             LIMIT 1`,
                            {
                                replacements: { sid: row.session_id, qtext: row.question_text, aid: row.answer_id },
                                type: QueryTypes.SELECT
                            }
                        );

                        if (sibling) {
                            photoUrl = normalizeImagePath(sibling.photo_url) ||
                                normalizeImagePath(sibling.image_path) ||
                                normalizeImagePath(sibling.before_photo_url);
                        }
                    }
                }

                // Temporal Salvage (LAST RESORT)
                if (!photoUrl && row.status === "DEFICIENCY") {
                    photoUrl = findImageByTimestamp(row.created_at);
                }

                if (photoUrl) {
                    console.log("[SALVAGE] Successfully recovered photo for defect:", row.answer_id);
                }

            } catch (err) {
                console.warn("[DEEP SALVAGE ERROR]", err.message);
            }
        }

        return {
            ...row,
            photo_url: photoUrl,
            after_photo_url: safeAfterPhotoUrl,
            has_before_photo: !!photoUrl,
            has_after_photo: !!safeAfterPhotoUrl
        };
    }));
};

/**
 * getSummaryStats
 * Returns enhanced aggregated statistics for charts
 */
exports.getSummaryStats = async (currentUser = null) => {
    const isSQLite = sequelize.options.dialect === 'sqlite';
    const today = new Date().toISOString().split('T')[0];
    const todayStart = `${today} 00:00:00`;
    const todayEnd = `${today} 23:59:59`;

    // Isolation Logic
    let replacements = { todayStart, todayEnd };
    let userFilters = {
        wsp: '', sick: '', comm: '', cai: '', pit: '',
        insp_ans: '', sick_ans: '', comm_ans: '', cai_ans: ''
    };

    if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
        replacements.userId = currentUser.id;
        const filter = ' AND created_by = :userId';
        const filterInsp = ' AND inspector_id = :userId';
        const filterAns = ' AND session_id IN (SELECT id FROM wsp_sessions WHERE created_by = :userId)'; // This is complex, let's simplify per subquery
        
        userFilters.wsp = ' AND created_by = :userId';
        userFilters.sick = ' AND created_by = :userId';
        userFilters.comm = ' AND created_by = :userId';
        userFilters.cai = ' AND inspector_id = :userId';
        userFilters.pit = ' AND inspector_id = :userId';
        
        userFilters.insp_ans = ' AND session_id IN (SELECT id FROM wsp_sessions WHERE created_by = :userId)';
        userFilters.sick_ans = ' AND session_id IN (SELECT id FROM sickline_sessions WHERE created_by = :userId)';
        userFilters.comm_ans = ' AND session_id IN (SELECT id FROM commissionary_sessions WHERE created_by = :userId)';
        userFilters.cai_ans = ' AND session_id IN (SELECT id FROM cai_sessions WHERE inspector_id = :userId)';
    }

    const countsQuery = `
        SELECT
            (
                (SELECT COUNT(*) FROM wsp_sessions WHERE (createdAt BETWEEN :todayStart AND :todayEnd) ${userFilters.wsp}) +
                (SELECT COUNT(*) FROM sickline_sessions WHERE (createdAt BETWEEN :todayStart AND :todayEnd) ${userFilters.sick}) +
                (SELECT COUNT(*) FROM commissionary_sessions WHERE (createdAt BETWEEN :todayStart AND :todayEnd) ${userFilters.comm}) +
                (SELECT COUNT(*) FROM cai_sessions WHERE (createdAt BETWEEN :todayStart AND :todayEnd) ${userFilters.cai}) +
                (SELECT COUNT(*) FROM pitline_sessions WHERE (createdAt BETWEEN :todayStart AND :todayEnd) ${userFilters.pit})
            ) AS total_inspections_today,
            (
                (SELECT COUNT(*) FROM inspection_answers WHERE status = 'DEFICIENCY' AND resolved = 0 ${userFilters.insp_ans}) +
                (SELECT COUNT(*) FROM sickline_answers WHERE status = 'DEFICIENCY' AND resolved = 0 ${userFilters.sick_ans}) +
                (SELECT COUNT(*) FROM commissionary_answers WHERE status = 'DEFICIENCY' AND resolved = 0 ${userFilters.comm_ans}) +
                (SELECT COUNT(*) FROM cai_answers WHERE status = 'DEFICIENCY' AND resolved = 0 ${userFilters.cai_ans})
            ) AS total_open_defects,
            (
                (SELECT COUNT(*) FROM inspection_answers WHERE status = 'DEFICIENCY' AND resolved = 1 ${userFilters.insp_ans}) +
                (SELECT COUNT(*) FROM sickline_answers WHERE status = 'DEFICIENCY' AND resolved = 1 ${userFilters.sick_ans}) +
                (SELECT COUNT(*) FROM commissionary_answers WHERE status = 'DEFICIENCY' AND resolved = 1 ${userFilters.comm_ans}) +
                (SELECT COUNT(*) FROM cai_answers WHERE status = 'DEFICIENCY' AND resolved = 1 ${userFilters.cai_ans})
            ) AS total_resolved_defects,
            (
                (SELECT COUNT(*) FROM wsp_sessions WHERE status IN ('DRAFT', 'IN_PROGRESS') ${userFilters.wsp}) +
                (SELECT COUNT(*) FROM sickline_sessions WHERE status IN ('DRAFT', 'IN_PROGRESS') ${userFilters.sick}) +
                (SELECT COUNT(*) FROM commissionary_sessions WHERE status IN ('DRAFT', 'IN_PROGRESS') ${userFilters.comm}) +
                (SELECT COUNT(*) FROM cai_sessions WHERE status IN ('DRAFT', 'IN_PROGRESS') ${userFilters.cai}) +
                (SELECT COUNT(*) FROM pitline_sessions WHERE status IN ('DRAFT', 'IN_PROGRESS') ${userFilters.pit})
            ) AS active_sessions_count
    `;

    const counts = await sequelize.query(countsQuery, {
        replacements,
        type: QueryTypes.SELECT
    });

    const perModuleQuery = `
        SELECT 'WSP' as module_type, COUNT(*) as count FROM wsp_sessions WHERE 1=1 ${userFilters.wsp}
        UNION ALL
        SELECT 'SICKLINE', COUNT(*) FROM sickline_sessions WHERE 1=1 ${userFilters.sick}
        UNION ALL
        SELECT 'COMMISSIONARY', COUNT(*) FROM commissionary_sessions WHERE 1=1 ${userFilters.comm}
        UNION ALL
        SELECT 'CAI', COUNT(*) FROM cai_sessions WHERE 1=1 ${userFilters.cai}
        UNION ALL
        SELECT 'PITLINE', COUNT(*) FROM pitline_sessions WHERE 1=1 ${userFilters.pit}
    `;
    const perModule = await sequelize.query(perModuleQuery, { replacements, type: QueryTypes.SELECT });

    // Last 7 Days Trend (Dialect Aware)
    let trendQuery;
    if (isSQLite) {
        trendQuery = `
            SELECT date, SUM(count) as count FROM (
                SELECT date(createdAt) as date, COUNT(*) as count FROM wsp_sessions WHERE (createdAt >= date('now', '-6 days') ${userFilters.wsp}) GROUP BY date(createdAt)
                UNION ALL
                SELECT date(createdAt), COUNT(*) FROM sickline_sessions WHERE (createdAt >= date('now', '-6 days') ${userFilters.sick}) GROUP BY date(createdAt)
                UNION ALL
                SELECT date(createdAt), COUNT(*) FROM commissionary_sessions WHERE (createdAt >= date('now', '-6 days') ${userFilters.comm}) GROUP BY date(createdAt)
                UNION ALL
                SELECT date(createdAt), COUNT(*) FROM cai_sessions WHERE (createdAt >= date('now', '-6 days') ${userFilters.cai}) GROUP BY date(createdAt)
                UNION ALL
                SELECT date(createdAt), COUNT(*) FROM pitline_sessions WHERE (createdAt >= date('now', '-6 days') ${userFilters.pit}) GROUP BY date(createdAt)
            ) as t
            GROUP BY date
            ORDER BY date ASC
        `;
    } else {
        trendQuery = `
            SELECT date, SUM(count) as count FROM (
                SELECT DATE(createdAt) as date, COUNT(*) as count FROM wsp_sessions WHERE (createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) ${userFilters.wsp}) GROUP BY DATE(createdAt)
                UNION ALL
                SELECT DATE(createdAt), COUNT(*) FROM sickline_sessions WHERE (createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) ${userFilters.sick}) GROUP BY DATE(createdAt)
                UNION ALL
                SELECT DATE(createdAt), COUNT(*) FROM commissionary_sessions WHERE (createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) ${userFilters.comm}) GROUP BY DATE(createdAt)
                UNION ALL
                SELECT DATE(createdAt), COUNT(*) FROM cai_sessions WHERE (createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) ${userFilters.cai}) GROUP BY DATE(createdAt)
                UNION ALL
                SELECT DATE(createdAt), COUNT(*) FROM pitline_sessions WHERE (createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) ${userFilters.pit}) GROUP BY DATE(createdAt)
            ) as t
            GROUP BY date
            ORDER BY date ASC
        `;
    }

    const trend = await sequelize.query(trendQuery, { replacements, type: QueryTypes.SELECT });

    return {
        ...counts[0],
        module_distribution: perModule,
        defect_trend: trend,
        defect_status: [
            { name: 'Open', value: counts[0].total_open_defects },
            { name: 'Resolved', value: counts[0].total_resolved_defects }
        ]
    };
};
