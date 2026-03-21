const sequelize = require('../config/db');

async function fixAndSeed() {
    try {
        console.log("Dropping foreign key constraint on Reasons table...");
        try {
            await sequelize.query("ALTER TABLE Reasons DROP FOREIGN KEY reasons_ibfk_1;");
            console.log("FK dropped.");
        } catch (e) {
            console.log("FK might already be dropped or missing:", e.message);
        }

        const questionsToSeed = [33, 34, 35, 36];
        const reasonsList = [
            'Bent/Broken/Damaged component',
            'Improper functioning/Not working',
            'Missing part/component',
            'Other (Specify in remarks)'
        ];

        console.log("Seeding CAI reasons...");
        for (const qid of questionsToSeed) {
            // Check if already seeded to avoid duplicates
            const [existing] = await sequelize.query(`SELECT id FROM Reasons WHERE question_id = ${qid}`);
            if (existing.length === 0) {
                console.log(`Seeding for question_id: ${qid}`);
                for (const text of reasonsList) {
                    await sequelize.query(
                        `INSERT INTO Reasons (question_id, text, created_at) VALUES (?, ?, NOW())`,
                        { replacements: [qid, text] }
                    );
                }
            } else {
                console.log(`Reasons already exist for question_id: ${qid}`);
            }
        }
        console.log("CAI reasons seeding completed successfully.");
    } catch (e) {
        console.error("Error during FK drop or seeding:", e);
    }
    process.exit();
}
fixAndSeed();
