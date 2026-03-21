/**
 * restore_coach_names.js
 *
 * This script:
 * 1. Adds a `coach_name` column to `pitline_coaches` if it doesn't exist
 * 2. Restores original coach labels (B1, GEN1, EOG1, etc.) from the
 *    identity the train was seeded with, using the stored position to
 *    re-derive the original name for default coaches.
 * 3. For manually-added coaches (position > 22), sets coach_name = coach_number
 *    so both fields are always populated.
 *
 * Run once:
 *   node restore_coach_names.js
 */

const { PitLineCoach, sequelize } = require('./models');
const { QueryTypes } = require('sequelize');

// The original default coach list ordered by position (same as createTrain originally)
const DEFAULT_NAMES = [
    'EOG1', 'GEN1', 'GEN2', 'GEN3', 'GEN4',
    'S1', 'S2', 'S3', 'S4', 'S5', 'S6',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
    'A1', 'A2', 'H1', 'PANTRY', 'EOG2'
];

async function restore() {
    console.log('=== Restore Coach Names ===\n');

    // 1. Add coach_name column if missing
    try {
        await sequelize.query(
            `ALTER TABLE pitline_coaches ADD COLUMN coach_name VARCHAR(50) NULL`,
            { type: QueryTypes.RAW }
        );
        console.log('✅ Added coach_name column\n');
    } catch (e) {
        if (e.message && e.message.includes('duplicate column')) {
            console.log('ℹ️  coach_name column already exists — skipping ALTER\n');
        } else {
            throw e;
        }
    }

    // 2. Load all coaches
    const all = await PitLineCoach.findAll({ order: [['id', 'ASC']] });

    let updated = 0;

    for (const coach of all) {
        // Derive original name from position for default coaches
        let name = null;

        if (coach.position >= 1 && coach.position <= DEFAULT_NAMES.length) {
            name = DEFAULT_NAMES[coach.position - 1];
        } else {
            // Manually added coach — use current coach_number as its label
            name = `Coach ${coach.position || coach.id}`;
        }

        await sequelize.query(
            `UPDATE pitline_coaches SET coach_name = ? WHERE id = ?`,
            { replacements: [name, coach.id], type: QueryTypes.UPDATE }
        );

        console.log(`  Coach ID ${coach.id} (pos ${coach.position}): coach_name = "${name}", coach_number = ${coach.coach_number}`);
        updated++;
    }

    console.log(`\n✅ Restored ${updated} coach name(s). Done!`);
    process.exit(0);
}

restore().catch(err => {
    console.error('Restore failed:', err.message);
    process.exit(1);
});
