const { InspectionAnswer, Activity, sequelize } = require('../models');

async function backfillActivityTypes() {
    try {
        console.log('--- STARTING BACKFILL: ACTIVITY TYPES ---');

        // Find all answers where activity_type is null
        const legacyAnswers = await InspectionAnswer.findAll({
            where: { activity_type: null },
            include: [{ model: Activity }]
        });

        console.log(`Found ${legacyAnswers.length} legacy records to update.`);

        let updatedCount = 0;
        for (const ans of legacyAnswers) {
            if (ans.Activity) {
                ans.activity_type = ans.Activity.type;
                await ans.save();
                updatedCount++;
            }
        }

        console.log(`Successfully backfilled ${updatedCount} records.`);
        console.log('--- BACKFILL COMPLETE ---');
        process.exit(0);
    } catch (err) {
        console.error('Backfill Error:', err);
        process.exit(1);
    }
}

backfillActivityTypes();
