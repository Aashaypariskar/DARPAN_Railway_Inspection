const { Question, AmenityItem, LtrItem, sequelize } = require('./models');

async function fixData() {
    try {
        console.log('--- STARTING QUESTION LINK FIX ---');

        const questions = await Question.findAll();
        console.log(`Total questions to check: ${questions.length}`);

        let fixedAmenity = 0;
        let fixedLtr = 0;
        let skipped = 0;

        for (const q of questions) {
            if (!q.item_id) {
                skipped++;
                continue;
            }

            // If it has subcategory_id, it belongs to an AmenityItem
            if (q.subcategory_id && !q.amenity_item_id) {
                q.amenity_item_id = q.item_id;
                await q.save();
                fixedAmenity++;
            }
            // If it has schedule_id, it belongs to an LtrItem
            else if (q.schedule_id && !q.ltr_item_id) {
                q.ltr_item_id = q.item_id;
                await q.save();
                fixedLtr++;
            } else {
                skipped++;
            }
        }

        console.log(`FIXED: AmenityLinks: ${fixedAmenity}, LtrLinks: ${fixedLtr}, Skipped: ${skipped}`);
        console.log('--- FIX COMPLETE ---');
    } catch (error) {
        console.error('Fix Fatal Error:', error);
    } finally {
        process.exit(0);
    }
}

fixData();
