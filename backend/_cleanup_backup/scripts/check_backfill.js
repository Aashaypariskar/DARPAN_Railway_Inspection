const { Coach } = require('./models');

async function checkBackfill() {
    try {
        const nullCoaches = await Coach.findAll({
            where: { module_type: null }
        });

        if (nullCoaches.length > 0) {
            console.log(`[ALERT] Found ${nullCoaches.length} coaches with NULL module_type:`);
            nullCoaches.forEach(c => {
                console.log(` - ID: ${c.id}, Number: ${c.coach_number}`);
            });
        } else {
            console.log('[SUCCESS] All coaches have a module_type assigned.');
        }
        process.exit(0);
    } catch (err) {
        console.error('[ERROR] Failed to check coaches:', err);
        process.exit(1);
    }
}

checkBackfill();
