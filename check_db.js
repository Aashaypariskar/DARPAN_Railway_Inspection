
const { sequelize } = require('./backend/models');
const fs = require('fs');

async function detailedAudit() {
    try {
        let output = "";
        const log = (msg) => { output += msg + "\n"; };

        log("--- Detailed Session 5 Lifecycle Audit ---");

        const [session] = await sequelize.query(`SELECT id, status, createdAt, updatedAt FROM cai_sessions WHERE id = 5;`);
        if (session.length === 0) {
            log("Session 5 NOT FOUND!");
        } else {
            const s = session[0];
            log(`Session ID: ${s.id}`);
            log(`Status: ${s.status}`);
            log(`Created: ${s.createdAt}`);
            log(`Submitted/Updated: ${s.updatedAt}`);
        }

        const [questions] = await sequelize.query(`SELECT id, cai_code, question_text, createdAt, is_active FROM cai_questions ORDER BY cai_code ASC;`);
        const [answers] = await sequelize.query(`SELECT question_id, createdAt, status FROM cai_answers WHERE session_id = 5;`);

        const answerMap = {};
        answers.forEach(a => { answerMap[a.question_id] = a; });

        log("\n--- Questions Mapping ---");
        log("ID | Code | CreatedAt | Active | Answered? | AnswerCreatedAt | Status");
        log("-".repeat(80));

        questions.forEach(q => {
            const ans = answerMap[q.id];
            const answered = ans ? "YES" : "NO";
            const ansCreated = ans ? ans.createdAt : "N/A";
            const status = ans ? ans.status : "N/A";
            log(`${q.id.toString().padEnd(4)} | ${q.cai_code.padEnd(6)} | ${q.createdAt.toISOString().substring(0, 19)} | ${q.is_active ? "Y" : "N"} | ${answered.padEnd(9)} | ${ansCreated === "N/A" ? "N/A".padEnd(19) : ansCreated.toISOString().substring(0, 19)} | ${status}`);
        });

        fs.writeFileSync('cai_audit.txt', output);
        console.log("Audit written to cai_audit.txt");

    } catch (err) {
        console.error("Audit Error:", err.message);
    } finally {
        process.exit();
    }
}

detailedAudit();
