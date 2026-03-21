const mysql = require('mysql2/promise');

async function run() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST || '3.110.16.111',
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3307,
            user: process.env.DB_USER || 'railway_user',
            password: process.env.DB_PASS || 'Railway@123',
            database: process.env.DB_NAME || 'inspection_db'
        });

        console.log('Connected directly to MySQL');

        const [rows] = await conn.execute("SELECT id FROM questions WHERE category = 'Undergear'");
        console.log(`Found ${rows.length} Undergear questions`);

        const reasons = [
            'Complete Failure',
            'Structural Damage',
            'Replacement Required',
            'Safety Hazard',
            'Beyond Repair',
            'Non-Functional'
        ];

        let count = 0;
        for (const row of rows) {
            for (const text of reasons) {
                try {
                    await conn.execute(
                        `INSERT INTO Reasons (question_id, text, created_at, updatedAt) VALUES (?, ?, NOW(), NOW())`,
                        [row.id, text]
                    );
                    count++;
                } catch (e) {
                    if (e.code === 'ER_DUP_ENTRY') continue;
                    try {
                        await conn.execute(
                            `INSERT INTO Reasons (question_id, text) VALUES (?, ?)`,
                            [row.id, text]
                        );
                        count++;
                    } catch (e2) {
                        if (e2.code !== 'ER_DUP_ENTRY') {
                            console.error(`Failed to insert reason for Q${row.id}: ${e2.message}`);
                        }
                    }
                }
            }
        }

        console.log(`Successfully mapped ${count} reasons to Undergear questions!`);
        await conn.end();
        console.log(`Connection closed safely, exiting naturally.`);
        setTimeout(() => { }, 100); // keep event loop briefly alive to flush IO
    } catch (err) {
        console.error('Raw Seeding Error:', err);
        if (conn) {
            try { await conn.end(); } catch (ignored) { }
        }
    }
}

run();
