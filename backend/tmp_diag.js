const { sequelize } = require('./models');
const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');

async function diag() {
    let output = '';
    const log = (msg) => {
        output += msg + '\n';
        console.log(msg);
    };

    try {
        log('--- STARTING DIAG ---');
        const query = 'SELECT id, session_id, status, photo_url, createdAt FROM sickline_answers WHERE id IN (50, 51, 52)';
        const rows = await sequelize.query(query, { type: QueryTypes.SELECT });
        log('--- DB ROWS ---');
        log(JSON.stringify(rows, null, 2));

        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            log('Uploads dir not found');
            return;
        }

        const files = fs.readdirSync(uploadsDir);
        const photoFiles = files.filter(f => f.startsWith('photo-')).map(f => {
            const stat = fs.statSync(path.join(uploadsDir, f));
            return {
                name: f,
                mtime: stat.mtime.toISOString(),
                mtimeMs: stat.mtimeMs
            };
        }).sort((a, b) => b.mtimeMs - a.mtimeMs);

        log('--- RECENT 20 FILES ---');
        log(JSON.stringify(photoFiles.slice(0, 20), null, 2));

        const { findImageByTimestamp } = require('./utils/pathHelper');
        log('--- SALVAGE TEST ---');
        for (const row of rows) {
            const result = findImageByTimestamp(row.createdAt);
            log(`DEF-${row.id} (Created: ${row.createdAt}) -> Result: ${result}`);
        }

    } catch (err) {
        log('DIAG ERROR: ' + err.stack);
    } finally {
        fs.writeFileSync('tmp_diag_results.txt', output, 'utf8');
        process.exit();
    }
}

diag();
